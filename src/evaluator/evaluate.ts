import { Cell, InitialEnvironment } from "../editor/library/environments";
import { isHole } from "../editor/trees/tree";
import { Expr, NameBinding } from "../expr/expr";
import { Defines } from "./defines";
import { checkCallAgainstTypeSignature } from "./dynamic-type";
import { Stack } from "./environment";
import { FnValue, Value, valueAsBool } from "./value";

/** Call-by-value evaluator */
export class Evaluator {
  env!: Stack<Value>;

  constructor(public defines: Defines = new Defines()) {}

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
        const cell = this.#get(expr.id);
        if (!cell?.value) throw "unbound variable: " + expr.id;

        return cell.value;
      }

      case "call": {
        const { called, args } = expr;

        const calledValue = this.#eval(called);
        if (calledValue.kind !== "fn") throw "cannot call non-function";

        const argValues = args.map((arg) => this.#eval(arg));

        return this.call(calledValue, argValues);
      }

      case "define":
        if (expr.name.kind !== "name-binding") throw "'define' must be given a name";

        this.defines.add(expr.name.id, () => ({ value: this.#eval(expr.value) }));

        return { kind: "list", heads: [] };

      case "let": {
        const valueBindings: [string, Cell<Value>][] = expr.bindings.map(([name, value]) => [
          (name as NameBinding).id,
          { value: this.#eval(value) },
        ]);

        this.env.push();
        valueBindings.forEach(([name, cell]) => {
          this.env.bind({
            name,
            cell,
          });
        });

        const result: Value = this.#eval(expr.body);

        this.env.pop();

        return result;
      }

      case "letrec": {
        const valueBindings: [string, Cell<Value>][] = expr.bindings.map(([name]) => [
          (name as NameBinding).id,
          {},
        ]);

        this.env.push();
        valueBindings.forEach(([name, cell]) => {
          this.env.bind({
            name,
            cell,
          });
        });

        expr.bindings.forEach(([name, value]) => {
          const id = (name as NameBinding).id;
          this.env.get(id)!.cell.value = this.#eval(value);
        });

        const result: Value = this.#eval(expr.body);

        this.env.pop();

        return result;
      }

      case "lambda":
        // TODO: Real closures
        return {
          kind: "fn",
          signature: expr.params.map((param) => ({
            name: (param as NameBinding).id,
            // TODO: type and variadic?
          })),
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
      case "type":
        throw "TODO";
    }
  }

  call(fn: FnValue, args: Value[]): Value {
    checkCallAgainstTypeSignature(args, fn.signature);

    this.env.push();
    for (let i = 0; i < args.length && i < fn.signature.length; ++i) {
      const { name } = fn.signature[i]!;
      const value = args[i]!;
      this.env.bind({
        name,
        cell: { value },
      });
    }

    let result: Value;
    if (typeof fn.body === "function") {
      // Builtin
      result = fn.body(args, this);
    } else {
      result = this.#eval(fn.body);
    }

    this.env.pop();

    return result;
  }

  #get(name: string): Cell<Value> | undefined {
    return this.env.get(name)?.cell ?? this.defines.get(name);
  }
}
