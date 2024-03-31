import { keyBy } from "lodash";
import {
  Binding,
  Cell,
  Environment,
  InitialEnvironment,
  makeEnv,
  mergeEnvs,
} from "../editor/library/environments";
import { isHole } from "../editor/trees/tree";
import { Expr, NameBinding, getIdentifier, getPrettyName } from "../expr/expr";
import { Defines } from "./defines";
import { DynamicParamSignature, checkCallAgainstTypeSignature } from "./dynamic-type";
import { FnValue, ListValue, Value, listValueAsVector, valueAsBool } from "./value";
import { SparkgroundComponent } from "./component";

/** Call-by-value evaluator */
export class Evaluator {
  baseEnv: Environment;
  env: Environment;
  defines: Defines<Cell<Value>>;
  components: SparkgroundComponent[] = [];

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

  addDefines(roots: Expr[]) {
    for (const root of roots) {
      switch (root.kind) {
        case "struct":
        case "define":
          this.eval(root);
      }
    }
  }

  eval(expr: Expr, extendEnv: Environment = {}): Value {
    return this.#eval(expr, { extendEnv });
  }

  #eval(expr: Expr, { env, extendEnv }: { env?: Environment; extendEnv?: Environment } = {}) {
    const prevEnv = this.env;
    if (env) this.env = mergeEnvs(this.baseEnv, env);
    if (extendEnv) this.env = mergeEnvs(this.env, extendEnv);

    const result = this.#eval_(expr);

    this.env = prevEnv;
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
          // TODO: More helpful behaviour
          throw "evaluating hole as expression";
        }
        return expr;

      case "var": {
        const cell = this.#get(expr.id);
        // TODO: Better error messages & metadata
        if (!cell) throw "unbound variable: " + expr.id;
        if (cell === "circular") throw "circular dependency: " + expr.id;
        if (!cell.value) throw "uninitialized variable: " + expr.id;

        return cell.value;
      }

      case "call": {
        const { called, args } = expr;

        const calledValue = this.#eval(called);
        if (calledValue.kind !== "fn") throw "cannot call non-function";

        const argValues = args.map((arg) => this.#eval(arg));

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
                    throw `structure passed to field accessor for ${getPrettyName(
                      fieldName
                    )} is an improper list`;
                  }

                  const fieldValue = vector[fieldIndex + 1];
                  if (!fieldValue) {
                    throw `wrong structure type passed to field accessor for ${getPrettyName(
                      fieldName
                    )}`;
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
        this.defines.add(getIdentifier(expr.name), () => ({ value: this.eval(expr.value) }));

        return { kind: "List", heads: [] };
      }

      case "let": {
        const valueBindings = expr.bindings.map(
          ([name, value]): Binding<Value> => ({
            name: (name as NameBinding).id,
            cell: { value: this.#eval(value) },
          })
        );

        return this.#eval(expr.body, { extendEnv: makeEnv(valueBindings) });
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

        expr.bindings.forEach(([name, value]) => {
          const binding = valueBindings[(name as NameBinding).id]!;
          binding.cell.value = this.#eval(value, { extendEnv: makeEnv([binding]) });
        });

        return this.#eval(expr.body, { extendEnv: makeEnv(Object.values(valueBindings)) });
      }

      case "lambda":
        return {
          kind: "fn",
          signature: expr.params.map((param) => ({
            name: (param as NameBinding).id,
            // TODO: type and variadic?
          })),
          body: expr.body,
          env: this.env,
        };

      case "sequence": {
        let result: Value = { kind: "List", heads: [] };
        expr.exprs.forEach((expr) => {
          result = this.#eval(expr);
        });

        return result;
      }

      case "and": {
        if (!expr.args.length) return { kind: "Boolean", value: true };

        let args = [...expr.args];
        console.log(JSON.stringify(args));
        let value: Value;
        do {
          const arg = args.shift()!;
          value = this.#eval(arg);
        } while (args.length && valueAsBool(value));

        return value;
      }

      case "or": {
        if (!expr.args.length) return { kind: "Boolean", value: false };

        let args = [...expr.args];
        let value: Value;
        do {
          const arg = args.shift()!;
          value = this.#eval(arg);
        } while (args.length && !valueAsBool(value));

        return value;
      }

      case "if": {
        const condition = this.#eval(expr.if);
        return this.#eval(valueAsBool(condition) ? expr.then : expr.else);
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
      result = this.#eval(fn.body, { env: callEnv });
    }

    return result;
  }

  #get(name: string): Cell<Value> | undefined | "circular" {
    return this.env[name]?.cell ?? this.defines.get(name);
  }
}
