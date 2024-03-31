import { Evaluator } from "./evaluate";
import { Value, ComponentValue } from "./value";

export class SparkgroundComponent {
  toDraw: (state: Value) => Value;
  onTick: (state: Value) => Value;

  private constructor(public state: Value) {}

  static create(initialState: Value, evaluator: Evaluator): ComponentValue {
    const component = new SparkgroundComponent(initialState);
    evaluator.components.push(component);
    return { kind: "component", component };
  }

  draw() {
    return this.toDraw(this.state);
  }

  tick() {
    this.state = this.onTick(this.state);
  }
}
