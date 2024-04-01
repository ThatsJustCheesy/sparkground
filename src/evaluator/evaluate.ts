import { keyBy } from "lodash";
import {
  Binding,
  Cell,
  Environment,
  InitialEnvironment,
  makeEnv,
  mergeEnvs,
} from "../editor/library/environments";
import { TreeIndexPath, extendIndexPath, isHole, nodeAtIndexPath } from "../editor/trees/tree";
import { Expr, NameBinding, getIdentifier, getPrettyName } from "../expr/expr";
import { Defines } from "./defines";
import { DynamicParamSignature, checkCallAgainstTypeSignature } from "./dynamic-type";
import { FnValue, ListValue, Value, listValueAsVector, valueAsBool } from "./value";
import { SparkgroundComponent } from "./component";
import { ErrorsByIndexPath } from "../expr/errors";
import {
  CallToNonFunction,
  CircularDependency,
  HoleEval,
  ImproperList,
  RuntimeError,
  UnboundVariable,
  UninitializedVariable,
  WrongStructType,
} from "./errors";

/** Call-by-value evaluator */
export class Evaluator {
  baseEnv: Environment;
  env: Environment;
  defines: Defines<Cell<Value>>;
  components: SparkgroundComponent[] = [];

  indexPath?: TreeIndexPath;
  errors: ErrorsByIndexPath<RuntimeError> = new ErrorsByIndexPath();

  constructor({
    baseEnv,
    defines,
  }: {
    baseEnv?: Environment;
    defines?: Defines<Cell<Value>>;
  } = {}) {
    this.baseEnv = baseEnv ?? InitialEnvironment;
    this.env = { ...this.baseEnv };
    this.defines = defines ?? new Defines();
  }

  addDefines(rootIndexPaths: TreeIndexPath[]) {
    for (const rootIndexPath of rootIndexPaths) {
      const root = nodeAtIndexPath(rootIndexPath);
      switch (root.kind) {
        case "struct":
        case "define":
          this.eval(root, { indexPath: rootIndexPath });
      }
    }
  }

  eval(
    expr: Expr,
    { indexPath, extendEnv }: { indexPath?: TreeIndexPath; extendEnv?: Environment } = {}
  ): Value | undefined {
    try {
      return this.#eval(expr, { indexPath, extendEnv });
    } catch (error) {
      console.error(error);
    }
  }

  #eval(
    expr: Expr,
    {
      indexPath,
      index,
      env,
      extendEnv,
    }: {
      indexPath?: TreeIndexPath;
      index?: number;
      env?: Environment;
      extendEnv?: Environment;
    } = {}
  ) {
    const prevEnv = this.env;
    if (env) this.env = mergeEnvs(this.baseEnv, env);
    if (extendEnv) this.env = mergeEnvs(this.env, extendEnv);

    const prevIndexPath = this.indexPath;
    if (indexPath) this.indexPath = indexPath;
    if (index !== undefined && this.indexPath) {
      this.indexPath = extendIndexPath(this.indexPath, index);
    }
    console.log("eval with indexPath", this.indexPath);

    let result: Value;
    try {
      result = this.#eval_(expr);
    } catch (error) {
      if (typeof error === "object" && "tag" in error && this.indexPath) {
        this.errors.add(this.indexPath, error);
      }
      // FIXME: Don't just rethrow; abort execution
      throw error;
    }

    this.env = prevEnv;
    this.indexPath = prevIndexPath;
    return result;
  }

  #eval_(expr: Expr): Value {
    switch (expr.kind) {
      case "Number":
      case "Boolean":
      case "String":
      case "Symbol":
      case "List":
        if (isHole(expr)) {
          throw { tag: "HoleEval" } satisfies HoleEval;
        }
        return expr;

      case "var": {
        const cell = this.#get(expr.id);

        if (!cell) {
          throw { tag: "UnboundVariable", name: expr.id } satisfies UnboundVariable;
        }
        if (cell === "circular") {
          throw { tag: "CircularDependency", name: expr.id } satisfies CircularDependency;
        }
        if (!cell.value) {
          throw { tag: "UninitializedVariable", name: expr.id } satisfies UninitializedVariable;
        }

        return cell.value;
      }

      case "call": {
        const { called, args } = expr;

        const calledValue = this.#eval(called, { index: 0 });
        if (calledValue.kind !== "fn") {
          throw { tag: "CallToNonFunction", called: calledValue } satisfies CallToNonFunction;
        }

        const argValues = args.map((arg, index) => this.#eval(arg, { index: index + 1 }));

        return this.call(calledValue, argValues);
      }

      case "struct": {
        // Constructor
        this.defines.add(
          getIdentifier(expr.name),
          (): Cell<FnValue> => ({
            value: {
              kind: "fn",
              signature: expr.fields.map(
                (fieldName): DynamicParamSignature => ({ name: getPrettyName(fieldName) })
              ),
              body: (args: Value[]): Value => {
                return {
                  kind: "List",
                  heads: [{ kind: "Symbol", value: getIdentifier(expr.name) }, ...args],
                };
              },
            },
          }),
          {
            typeAnnotation: isHole(expr.name) ? undefined : expr.name.type,
            bodyArgHints: expr.fields.map((name) => getPrettyName(name)),
          }
        );

        // Field accessors
        this.defines.addAll(
          expr.fields.map((fieldName, fieldIndex) => [
            getIdentifier(fieldName),
            (): Cell<FnValue> => ({
              value: {
                kind: "fn",
                signature: [{ name: "structure", type: "List" }],
                body: (args: Value[]): Value => {
                  const [struct] = args as [ListValue];

                  const vector = listValueAsVector(struct);
                  if (!vector) {
                    throw {
                      tag: "ImproperList",
                      functionName: getPrettyName(fieldName),
                      argValue: struct,
                    } satisfies ImproperList;
                  }

                  const fieldValue = vector[fieldIndex + 1];
                  if (!fieldValue) {
                    throw {
                      tag: "WrongStructType",
                      structName: getPrettyName(fieldName),
                    } satisfies WrongStructType;
                  }

                  return fieldValue;
                },
              },
            }),
          ])
        );

        return { kind: "List", heads: [] };
      }

      case "define": {
        const defineBodyIndexPath = this.indexPath ? extendIndexPath(this.indexPath, 1) : undefined;
        this.defines.add(getIdentifier(expr.name), () => ({
          value: this.#eval(expr.value, { indexPath: defineBodyIndexPath }),
        }));

        return { kind: "List", heads: [] };
      }

      case "let": {
        const valueBindings = expr.bindings.map(
          ([name, value], index): Binding<Value> => ({
            name: (name as NameBinding).id,
            cell: { value: this.#eval(value, { index: 2 * index + 1 }) },
          })
        );

        return this.#eval(expr.body, {
          index: 2 * expr.bindings.length,
          extendEnv: makeEnv(valueBindings),
        });
      }

      case "letrec": {
        const valueBindings = keyBy(
          expr.bindings.map(
            ([name]): Binding<Value> => ({
              name: (name as NameBinding).id,
              cell: {},
            })
          ),
          ({ name }) => name
        );

        expr.bindings.forEach(([name, value], index) => {
          const binding = valueBindings[(name as NameBinding).id]!;
          binding.cell.value = this.#eval(value, {
            index: 2 * index + 1,
            extendEnv: makeEnv([binding]),
          });
        });

        return this.#eval(expr.body, {
          index: 2 * expr.bindings.length,
          extendEnv: makeEnv(Object.values(valueBindings)),
        });
      }

      case "lambda":
        console.log(
          `lambda body indexPath:
            
          `,
          this.indexPath ? extendIndexPath(this.indexPath, expr.params.length + 1) : undefined
        );
        return {
          kind: "fn",
          signature: expr.params.map((param) => ({
            name: (param as NameBinding).id,
            // TODO: type and variadic?
          })),
          body: expr.body,
          indexPath: this.indexPath
            ? extendIndexPath(this.indexPath, expr.params.length + 1)
            : undefined,
          env: this.env,
        };

      case "sequence": {
        let result: Value = { kind: "List", heads: [] };
        expr.exprs.forEach((expr, index) => {
          result = this.#eval(expr, { index });
        });

        return result;
      }

      case "and": {
        if (!expr.args.length) return { kind: "Boolean", value: true };

        let args = [...expr.args];
        console.log(JSON.stringify(args));
        let value: Value;
        let index = 0;
        do {
          const arg = args.shift()!;
          value = this.#eval(arg, { index: index++ });
        } while (args.length && valueAsBool(value));

        return value;
      }

      case "or": {
        if (!expr.args.length) return { kind: "Boolean", value: false };

        let args = [...expr.args];
        let value: Value;
        let index = 0;
        do {
          const arg = args.shift()!;
          value = this.#eval(arg, { index: index++ });
        } while (args.length && !valueAsBool(value));

        return value;
      }

      case "if": {
        const condition = this.#eval(expr.if, { index: 0 });
        if (valueAsBool(condition)) {
          return this.#eval(expr.then, { index: 1 });
        } else {
          return this.#eval(expr.else, { index: 2 });
        }
      }

      case "cond":
      case "name-binding":
      case "type":
        throw "TODO";
    }
  }

  call(fn: FnValue, args: Value[]): Value {
    checkCallAgainstTypeSignature(args, fn.signature);

    let callEnv = fn.env ?? {};
    for (let i = 0; i < args.length && i < fn.signature.length; ++i) {
      const { name } = fn.signature[i]!;
      const value = args[i]!;

      callEnv = mergeEnvs(callEnv, {
        [name]: {
          name,
          cell: { value },
        },
      });
    }

    let result: Value;
    if (typeof fn.body === "function") {
      // Builtin
      result = fn.body(args, this);
    } else {
      result = this.#eval(fn.body, {
        indexPath: fn.indexPath,
        env: callEnv,
      });
    }

    return result;
  }

  #get(name: string): Cell<Value> | undefined | "circular" {
    return this.env[name]?.cell ?? this.defines.get(name);
  }
}
