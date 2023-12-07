import { Expr, NameBinding, VarSlot } from "../typechecker/ast/ast";
import { List, Value, isFn, valueAsBool } from "./value";

export type Binding = { name: string; value: Value };

type StackFrame = {
  bindings: Map<string, Binding>;
};

export class Environment {
  #stack: StackFrame[] = [];
  get #top(): StackFrame {
    return this.#stack[this.#stack.length - 1];
  }

  /**
   * @param globalBindings Shortcut to add bindings to outer global scope; for use by unit tests
   */
  constructor(globalBindings: Record<string, Value> = {}) {
    this.push();
    Object.entries(globalBindings).forEach(([name, value]) => {
      this.bind({ name, value });
    });

    this.bind({
      name: "cons",
      value: {
        params: ["car", "cdr"],
        body: (env) => {
          const car = env.get("car")!.value;
          const cdr = env.get("cdr")!.value as List; // TODO: Dynamic type checking
          return [car, ...cdr];
        },
      },
    });

    this.push();
  }

  get(identifier: string): Binding | undefined {
    for (let i = this.#stack.length - 1; i >= 0; --i) {
      const binding = this.#stack[i].bindings.get(identifier);
      if (binding) return binding;
    }

    return undefined;
  }

  bind(binding: Binding) {
    this.#top.bindings.set(binding.name, binding);
  }

  push() {
    this.#stack.push({ bindings: new Map() });
  }

  pop() {
    this.#stack.pop();
  }
}

/** Applicative order evaluator */
export class Evaluator {
  env!: Environment;

  eval(expr: Expr, env: Environment = new Environment()): Value {
    this.env = env;
    return this.#eval(expr);
  }

  #eval(expr: Expr): Value {
    switch (expr.kind) {
      case "number":
      case "bool":
      case "string":
        return expr.value;

      case "null":
        return [];

      case "var": {
        const binding = this.env.get(expr.id);
        if (!binding) throw "unbound variable: " + expr.id;

        return binding.value;
      }

      case "call": {
        const { called, args } = expr;

        const calledValue = this.#eval(called);
        if (!isFn(calledValue)) throw "cannot call non-function";

        const argValues = args.map((arg) => this.#eval(arg));

        this.env.push();
        for (let i = 0; i < argValues.length && i < calledValue.params.length; ++i) {
          const name = calledValue.params[i];
          const value = argValues[i];
          this.env.bind({
            name,
            value,
          });
        }

        let result: Value = [];
        if (typeof calledValue.body === "function") {
          // Builtin
          result = calledValue.body(this.env);
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
          params: expr.params.map((param) => (param as NameBinding).id),
          body: expr.body,
        };

      case "sequence": {
        let result: Value = [];
        expr.exprs.forEach((expr) => {
          result = this.#eval(expr);
        });

        return result;
      }

      case "if":
        const condition = this.#eval(expr.if);
        return this.#eval(valueAsBool(condition) ? expr.then : expr.else);

      case "hole":

      case "cond":
      case "name-binding":
        throw "TODO";
    }
  }
}
