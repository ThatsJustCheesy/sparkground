import { InitialEnvironment } from "../editor/library/environments";
import { isHole } from "../editor/trees/tree";
import { Expr, NameBinding, VarSlot } from "../expr/expr";
import { Stack } from "./environment";
import { Value, valueAsBool } from "./value";

/** Call-by-value evaluator */
export class Evaluator {
  env!: Stack<Value>;

  eval(expr: Expr, env: Stack<Value> = new Stack()): Value {
    this.env = env;

    env.bind(...Object.values(InitialEnvironment));

    return this.#eval(expr);
  }

  #eval(expr: Expr): Value {
    switch (expr.kind) {
      case "number":
      case "bool":
      case "string":
      case "symbol":
      case "list":
        if (isHole(expr)) {
          // TODO: More helpful behaviour
          throw "evaluating hole as expression";
        }
        return expr;

      case "var": {
        const binding = this.env.get(expr.id);
        if (!binding) throw "unbound variable: " + expr.id;

        return binding.value;
      }

      case "call": {
        const { called, args } = expr;

        const calledValue = this.#eval(called);
        if (calledValue.kind !== "fn") throw "cannot call non-function";

        const argValues = args.map((arg) => this.#eval(arg));

        this.env.push();
        for (let i = 0; i < argValues.length && i < calledValue.params.length; ++i) {
          const name = calledValue.params[i]!;
          const value = argValues[i]!;
          this.env.bind({
            name,
            value,
          });
        }

        let result: Value;
        if (typeof calledValue.body === "function") {
          // Builtin
          result = calledValue.body(this.env, ({ value }) => value);
        } else {
          result = this.#eval(calledValue.body);
        }

        this.env.pop();

        return result;
      }

      case "define":
        throw "TODO";

      case "let": {
        const valueBindings: [VarSlot, Value][] = expr.bindings.map(([name, value]) => [
          name,
          this.#eval(value),
        ]);

        this.env.push();
        valueBindings.forEach(([name, value]) => {
          this.env.bind({
            name: (name as NameBinding).id,
            value,
          });
        });

        const result: Value = this.#eval(expr.body);

        this.env.pop();

        return result;
      }

      case "lambda":
        return {
          kind: "fn",
          params: expr.params.map((param) => (param as NameBinding).id),
          body: expr.body,
        };

      case "sequence": {
        let result: Value = { kind: "list", heads: [] };
        expr.exprs.forEach((expr) => {
          result = this.#eval(expr);
        });

        return result;
      }

      case "if":
        const condition = this.#eval(expr.if);
        return this.#eval(valueAsBool(condition) ? expr.then : expr.else);

      case "cond":
      case "name-binding":
        throw "TODO";
    }
  }
}