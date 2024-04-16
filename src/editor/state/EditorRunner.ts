import { Program } from "../../simulator/program";
import { Simulator } from "../../simulator/simulate";
import { Editor } from "./Editor";

export class EditorRunner {
  editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.#resetProgram();
  }

  program: Program;
  simulator = new Simulator();

  #resetProgram() {
    this.program = new Program(this.editor.trees.list());
    this.simulator.setProgram(this.program);
  }

  async runAll() {
    this.#resetProgram();
    this.simulator.run();
    this.editor.rerender();
  }

  stopAll() {
    this.simulator?.stop();
    this.#resetProgram();
    this.editor.rerender();
  }
}
