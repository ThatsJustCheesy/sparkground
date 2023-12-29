export type Binding<Domain> = { name: string; value: Domain };

type StackFrame<Domain> = {
  bindings: Map<string, Binding<Domain>>;
};

export class Environment<Domain> {
  #stack: StackFrame<Domain>[] = [];
  get #top(): StackFrame<Domain> {
    return this.#stack[this.#stack.length - 1];
  }

  /**
   * @param globalBindings Shortcut to add bindings to outer global scope; for use by unit tests
   */
  constructor(globalBindings: Record<string, Domain> = {}) {
    this.push();
    Object.entries(globalBindings).forEach(([name, value]) => {
      this.bind({ name, value });
    });

    this.push();
  }

  get(identifier: string): Binding<Domain> | undefined {
    for (let i = this.#stack.length - 1; i >= 0; --i) {
      const binding = this.#stack[i].bindings.get(identifier);
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

export type EvalFn<Domain, Value> = (binding: Binding<Domain>) => Value;

export type Builtin<Domain, Value> = (
  env: Environment<Domain>,
  evaluate: EvalFn<Domain, Value>
) => Value;
