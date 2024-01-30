import { Binding } from "../editor/library/environments";

type StackFrame<Domain> = {
  bindings: Map<string, Binding<Domain>>;
};

// TODO: Audit all uses of this. It isn't really correct.
export class Stack<Domain> {
  #stack: StackFrame<Domain>[] = [];
  get #top(): StackFrame<Domain> {
    return this.#stack[this.#stack.length - 1]!;
  }

  /**
   * @param globalBindings Shortcut to add bindings to outer global scope; for use by unit tests
   */
  constructor(globalBindings: Record<string, Domain> = {}) {
    this.push();
    Object.entries(globalBindings).forEach(([name, value]) => {
      this.bind({ name, cell: { value } });
    });

    this.push();
  }

  get(identifier: string): Binding<Domain> | undefined {
    for (let i = this.#stack.length - 1; i >= 0; --i) {
      const binding = this.#stack[i]!.bindings.get(identifier);
      if (binding) return binding;
    }

    return undefined;
  }

  bind(...bindings: Binding<Domain>[]) {
    for (const binding of bindings) {
      this.#top.bindings.set(binding.name, binding);
    }
  }

  push() {
    this.#stack.push({ bindings: new Map() });
  }

  pop() {
    this.#stack.pop();
  }
}

export type Builtin<Domain, Value, Evaluator> = (args: Domain[], evaluator: Evaluator) => Value;
