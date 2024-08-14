import { keyBy, zipWith } from "lodash";
import {
  Binding,
  Cell,
  Environment,
  InitialEnvironment,
  makeEnv,
  mergeEnvs,
} from "../editor/library/environments";
import { TreeIndexPath, extendIndexPath, isHole, nodeAtIndexPath } from "../editor/trees/tree";
import { Define, Expr, NameBinding, Struct, getIdentifier, getPrettyName } from "../expr/expr";
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
import { collect, withIndices } from "../util";

export type EvalState = {
  expr: Expr;
  indexPath?: TreeIndexPath;
  index?: number;
  env?: Environment;
  extendEnv?: Environment;
};

export type EvalStateGenerator<ReturnValue = Value> = Generator<
  /* yields */ EvalState,
  /* returns */ ReturnValue,
  /* accepts */ Value
>;

export interface EvaluatorInterface {
  components: SparkgroundComponent[];

  eval(fromState: EvalState): EvalStateGenerator;
  call(fn: FnValue, args: Value[]): EvalStateGenerator;
}

export function evalFully(evaluator: EvaluatorInterface, fromState: EvalState): Value | undefined {
  try {
    return evalFullyOrThrow(evaluator, fromState);
  } catch (error) {
    console.error(error);
  }
}

function evalFullyOrThrow(evaluator: EvaluatorInterface, state: EvalState) {
  return elaborate(evaluator, evaluator.eval(state));
}

export function elaborate(evaluator: EvaluatorInterface, generator: EvalStateGenerator) {
  let { done, value } = generator.next();
  while (!done) {
    const state = value as EvalState;
    ({ done, value } = generator.next(evalFullyOrThrow(evaluator, state)));
  }

  return value as Value;
}
/** Call-by-value evaluator */
export class Evaluator implements EvaluatorInterface {
  baseEnv: Environment;
  env: Environment;
  defines: Defines;
  components: SparkgroundComponent[] = [];

  indexPath?: TreeIndexPath;
  errors: ErrorsByIndexPath<RuntimeError> = new ErrorsByIndexPath();

  constructor({
    baseEnv,
    defines,
  }: {
    baseEnv?: Environment;
    defines?: Defines;
  } = {}) {
    this.baseEnv = baseEnv ?? InitialEnvironment;
    this.env = { ...this.baseEnv };
    this.defines = defines ?? new Defines();
  }

  addDefines(rootIndexPaths: TreeIndexPath[]) {
    for (const rootIndexPath of rootIndexPaths) {
      try {
        const root = nodeAtIndexPath(rootIndexPath);
        switch (root.kind) {
          case "struct":
            this.addStruct(root, rootIndexPath);
            break;
          case "define":
            this.addDefine(root, rootIndexPath);
            break;
        }
      } catch (error) {
        // TODO: Remove this try/catch once eval() is changed to not throw any errors
        console.error(error);
      }
    }
  }

  addDefine(define: Define, indexPath?: TreeIndexPath): void {
    const prevIndexPath = this.indexPath;
    if (indexPath) this.indexPath = indexPath;

    const defineBodyIndexPath = this.indexPath ? extendIndexPath(this.indexPath, 1) : undefined;
    const this_ = this;
    this.defines.add(getIdentifier(define.name), function* (): EvalStateGenerator<Cell<Value>> {
      return { value: yield* this_.eval({ expr: define.value, indexPath: defineBodyIndexPath }) };
    });

    this.indexPath = prevIndexPath;
  }

  addStruct(struct: Struct, indexPath?: TreeIndexPath): void {
    const prevIndexPath = this.indexPath;
    if (indexPath) this.indexPath = indexPath;

    // Constructor
    this.defines.add(
      getIdentifier(struct.name),
      function* (): EvalStateGenerator<Cell<FnValue>> {
        return {
          value: {
            kind: "fn",
            signature: struct.fields.map(
              (fieldName): DynamicParamSignature => ({ name: getPrettyName(fieldName) }),
            ),
            *body(args: Value[]): EvalStateGenerator {
              return {
                kind: "List",
                heads: [{ kind: "Symbol", value: getIdentifier(struct.name) }, ...args],
              };
            },
          },
        };
      },
      {
        typeAnnotation: isHole(struct.name) ? undefined : struct.name.type,
        bodyArgHints: struct.fields.map((name) => getPrettyName(name)),
      },
    );

    // Field accessors
    this.defines.addAll(
      struct.fields.map((fieldName, fieldIndex) => [
        getIdentifier(fieldName),
        function* (): EvalStateGenerator<Cell<FnValue>> {
          return {
            value: {
              kind: "fn",
              signature: [{ name: "structure", type: "List" }],
              *body(args: Value[]): EvalStateGenerator {
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
          };
        },
      ]),
    );

    this.indexPath = prevIndexPath;
  }

  /**
   * Evaluates `expr` down to a value.
   *
   * This method exists for unit testing; use the separate `evalFully` function otherwise.
   */
  evalFully(expr: Expr, fromState: Omit<EvalState, "expr"> = {}): Value | undefined {
    try {
      return evalFullyOrThrow(this, { ...fromState, expr });
    } catch (error) {
      if (!this.indexPath) {
        // Throw for unit tests
        throw error;
      } else {
        console.error(error);
        return;
      }
    }
  }

  *eval(fromState: EvalState): EvalStateGenerator {
    const { expr, indexPath, index, env, extendEnv } = fromState;

    const prevEnv = this.env;
    if (env) this.env = mergeEnvs(this.baseEnv, env);
    if (extendEnv) this.env = mergeEnvs(this.env, extendEnv);

    const prevIndexPath = this.indexPath;
    if (indexPath) this.indexPath = indexPath;
    if (index !== undefined && this.indexPath) {
      this.indexPath = extendIndexPath(this.indexPath, index);
    }

    let result: Value;
    try {
      result = yield* this.#eval_(expr);
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

  *#eval_(expr: Expr): EvalStateGenerator {
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
        const cell = yield* this.#get(expr.id);

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

        const calledValue = yield { expr: called, index: 0 };
        if (calledValue.kind !== "fn") {
          throw { tag: "CallToNonFunction", called: calledValue } satisfies CallToNonFunction;
        }

        const argValues = yield* collect(
          args.map((arg, index): EvalState => ({ expr: arg, index: index + 1 })),
        );

        return yield* this.call(calledValue, argValues);
      }

      case "struct":
        this.addStruct(expr);
        return { kind: "List", heads: [] };

      case "define":
        this.addDefine(expr);
        return { kind: "List", heads: [] };

      case "let": {
        const values = yield* collect(
          expr.bindings.map(
            ([, value], index): EvalState => ({ expr: value, index: 2 * index + 1 }),
          ),
        );
        const valueBindings = zipWith(expr.bindings, values, ([name], value) => ({
          name: (name as NameBinding).id,
          cell: { value },
        }));

        return yield {
          expr: expr.body,
          index: 2 * expr.bindings.length,
          extendEnv: makeEnv(valueBindings),
        };
      }

      case "letrec": {
        const valueBindings = keyBy(
          expr.bindings.map(
            ([name]): Binding<Value> => ({
              name: (name as NameBinding).id,
              cell: {},
            }),
          ),
          ({ name }) => name,
        );

        for (const [[name, value], index] of withIndices(expr.bindings)) {
          const binding = valueBindings[(name as NameBinding).id]!;
          binding.cell.value = yield {
            expr: value,
            index: 2 * index + 1,
            extendEnv: makeEnv([binding]),
          };
        }

        return yield {
          expr: expr.body,
          index: 2 * expr.bindings.length,
          extendEnv: makeEnv(Object.values(valueBindings)),
        };
      }

      case "lambda":
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
        const { exprs } = expr;

        let result: Value = { kind: "List", heads: [] };
        for (const [expr, index] of withIndices(exprs)) {
          result = yield { expr, index };
        }

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
          value = yield { expr: arg, index: index++ };
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
          value = yield { expr: arg, index: index++ };
        } while (args.length && !valueAsBool(value));

        return value;
      }

      case "if": {
        const condition = yield { expr: expr.if, index: 0 };
        if (valueAsBool(condition)) {
          return yield { expr: expr.then, index: 1 };
        } else {
          return yield { expr: expr.else, index: 2 };
        }
      }

      case "cond":
      case "name-binding":
      case "type":
        throw "TODO";
    }
  }

  *call(fn: FnValue, args: Value[]): EvalStateGenerator {
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
      result = yield* fn.body(args, this);
    } else {
      result = yield { expr: fn.body, indexPath: fn.indexPath, env: callEnv };
    }

    return result;
  }

  *#get(name: string): EvalStateGenerator<Cell<Value> | undefined | "circular"> {
    return this.env[name]?.cell ?? (yield* this.defines.get(name));
  }
}
