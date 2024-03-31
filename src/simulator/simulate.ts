import { GraphicValue, drawGraphic } from "../evaluator/graphics";
import { Program } from "./program";

export class Simulator {
  #program: Program;

  #intervalID: ReturnType<typeof setInterval>;

  setProgram(program: Program) {
    this.#program = program;
  }

  run() {
    this.stop();

    this.#program.runAll();
    const evaluator = this.#program.evaluator;

    let t = 0;

    this.#intervalID = setInterval(() => {
      t += 1000 / 24;

      for (const component of evaluator.components) {
        component.tick();
      }

      for (const component of evaluator.components) {
        // TODO: Dynamic typecheck!
        const graphic = component.draw() as GraphicValue;

        const canvas = document.querySelector(".output-area canvas");
        if (canvas) {
          const ctx = (canvas as HTMLCanvasElement).getContext?.("2d");
          if (ctx) drawGraphic(ctx, graphic);
        }
      }
    }, 1000 / 60);
  }

  stop() {
    clearInterval(this.#intervalID);
  }
}
