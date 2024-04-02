import { Evaluator } from "./evaluate";
import { Value, ComponentValue } from "./value";

export class SparkgroundComponent {
  toDraw: (state: Value) => Value;
  onTick: (state: Value) => Value;
  onKey: (state: Value, key: string) => Value;

  private constructor(public state: Value) {}

  static create(initialState: Value, evaluator: Evaluator): ComponentValue {
    const component = new SparkgroundComponent(initialState);
    evaluator.components.push(component);
    return { kind: "component", component };
  }

  draw() {
    try {
      return this.toDraw(this.state);
    } catch (error) {
      // TODO: Remove this try/catch once eval() is changed to not throw any errors
      console.error(error);
    }
  }

  tick() {
    try {
      this.state = this.onTick(this.state);
    } catch (error) {
      // TODO: Remove this try/catch once eval() is changed to not throw any errors
      console.error(error);
    }
  }

  handleKeypress(key: string) {
    try {
      this.state = this.onKey(this.state, key);
    } catch (error) {
      // TODO: Remove this try/catch once eval() is changed to not throw any errors
      console.error(error);
    }
  }
}
