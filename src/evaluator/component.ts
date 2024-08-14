import { elaborate, EvalStateGenerator, EvaluatorInterface } from "./evaluate";
import { Value, ComponentValue } from "./value";

export class SparkgroundComponent {
  toDraw?: (state: Value) => EvalStateGenerator;
  onTick?: (state: Value) => EvalStateGenerator;
  onKey?: (state: Value, key: string) => EvalStateGenerator;

  private constructor(
    public state: Value,
    public evaluator: EvaluatorInterface,
  ) {
    this.evaluator = evaluator;
    evaluator.components.push(this);
  }

  static create(initialState: Value, evaluator: EvaluatorInterface): ComponentValue {
    const component = new SparkgroundComponent(initialState, evaluator);
    return { kind: "component", component };
  }

  draw() {
    try {
      if (this.toDraw) {
        return elaborate(this.evaluator, this.toDraw(this.state));
      }
    } catch (error) {
      // TODO: Remove this try/catch once eval() is changed to not throw any errors
      console.error(error);
    }
  }

  tick() {
    try {
      if (this.onTick) {
        this.state = elaborate(this.evaluator, this.onTick(this.state));
      }
    } catch (error) {
      // TODO: Remove this try/catch once eval() is changed to not throw any errors
      console.error(error);
    }
  }

  handleKeypress(key: string) {
    try {
      if (this.onKey) {
        this.state = elaborate(this.evaluator, this.onKey(this.state, key));
      }
    } catch (error) {
      // TODO: Remove this try/catch once eval() is changed to not throw any errors
      console.error(error);
    }
  }
}
