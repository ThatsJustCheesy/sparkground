import { cloneDeep } from "lodash";
import { Binding, BindingAttributes, Environment } from "../editor/library/environments";

export class Defines<Value> {
  #bindings: Environment<() => Value> = {};
  #computed: Record<string, Value> = {};
  #computing: Set<string> = new Set();

  constructor() {
    this.clear();
  }

  clear(): void {
    this.#bindings = {};
    this.#computed = {};
    this.#computing = new Set();
  }

  clearComputed(): void {
    this.#computed = {};
  }

  addAll(entries: [identifier: string, compute: () => Value][]): void {
    for (const [identifier, compute] of entries) {
      this.add(identifier, compute);
    }
  }

  add(identifier: string, compute: () => Value, attributes?: BindingAttributes): void {
    this.addBinding({ name: identifier, cell: { value: compute }, attributes });
  }

  addBinding(binding: Binding<() => Value>): void {
    this.#bindings[binding.name] = binding;
  }

  has(identifier: string): boolean {
    return identifier in this.#bindings;
  }

  binding(name: string): Binding<() => Value> | undefined {
    return cloneDeep(this.#bindings[name]);
  }

  environment(): Environment<() => Value> {
    return cloneDeep(this.#bindings);
  }

  get(name: string): Value | undefined | "circular" {
    if (!(name in this.#computed)) {
      if (this.#computing.has(name)) {
        console.error(`Circular dependency for defined name: '${name}'`);
        return "circular";
      }

      if (!(name in this.#bindings)) return undefined;
      const binding = this.#bindings[name]!;
      const compute = binding.cell.value!;

      this.#computing.add(name);
      try {
        this.#computed[name] = compute();
      } finally {
        this.#computing.delete(name);
      }
    }

    return this.#computed[name];
  }

  names(): string[] {
    return Object.keys(this.#bindings);
  }

  computeAll(): void {
    this.names().forEach((name) => this.get(name));
  }
}
