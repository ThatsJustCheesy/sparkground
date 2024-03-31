import { cloneDeep } from "lodash";
import { Evaluator } from "../evaluator/evaluate";
import { Expr } from "../expr/expr";
import { Value } from "../evaluator/value";
import { Cell } from "../editor/library/environments";
import { Defines } from "../evaluator/defines";

export class Program {
  #entryPoints: Expr[];

  /**
   * @param entryPoints Expressions to evaluate when running the program. Order of evaluation is unspecified.
   *                    Entry points that are global definitions may be referred to throughout the rest of the program,
   *                    except when doing so would create a circular dependency.
   */
  constructor(entryPoints: Expr[]) {
    this.#entryPoints = cloneDeep(entryPoints);
  }

  #evaluator?: Evaluator;

  get evaluator(): Evaluator {
    if (!this.#evaluator) {
      this.#evaluator = new Evaluator();
      this.#evaluator.addDefines(this.#entryPoints);
    }
    return this.#evaluator;
  }

  get defines(): Defines<Cell<Value>> {
    return this.evaluator.defines;
  }

  evalInProgram(entryPoint: Expr): Value {
    return this.evaluator.eval(entryPoint);
  }

  runAll(): void {
    for (const entryPoint of this.#entryPoints) {
      this.evaluator.eval(entryPoint);
    }
  }
}
