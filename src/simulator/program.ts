import { evalFully, Evaluator } from "../evaluator/evaluate";
import { Value } from "../evaluator/value";
import { Defines } from "../evaluator/defines";
import { TreeIndexPath, nodeAtIndexPath, rootIndexPath } from "../editor/trees/tree";
import { Tree } from "../editor/trees/trees";

export class Program {
  #entryPointIndexPaths: TreeIndexPath[];

  /**
   * @param entryPoints Expressions to evaluate when running the program. Order of evaluation is unspecified.
   *                    Entry points that are global definitions may be referred to throughout the rest of the program,
   *                    except when doing so would create a circular dependency.
   */
  constructor(entryPoints: (Tree | TreeIndexPath)[]) {
    this.#entryPointIndexPaths = entryPoints.map(
      (ep): TreeIndexPath => ("tree" in ep ? ep : rootIndexPath(ep)),
    );
  }

  #evaluator?: Evaluator;

  get evaluator(): Evaluator {
    if (!this.#evaluator) {
      this.#evaluator = new Evaluator();
      this.#evaluator.addDefines(this.#entryPointIndexPaths);
    }
    return this.#evaluator;
  }

  get defines(): Defines {
    return this.evaluator.defines;
  }

  evalInProgram(entryPoint: TreeIndexPath): Value | undefined {
    return evalFully(this.evaluator, { expr: nodeAtIndexPath(entryPoint), indexPath: entryPoint });
  }

  evalInProgramInteractively(entryPoint: TreeIndexPath) {
    return this.evaluator.eval({ expr: nodeAtIndexPath(entryPoint), indexPath: entryPoint });
  }

  runAll(): void {
    for (const entryPoint of this.#entryPointIndexPaths) {
      this.evalInProgram(entryPoint);
    }
  }
}
