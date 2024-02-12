import { Cell } from "../editor/library/environments";
import { Value } from "./value";

export class Defines {
  #defines: Record<string, () => Cell<Value>> = {};
  #computed: Record<string, Cell<Value>> = {};

  addAll(entries: [name: string, compute: () => Cell<Value>][]) {
    for (const [name, compute] of entries) {
      this.add(name, compute);
    }
  }

  add(name: string, compute: () => Cell<Value>) {
    this.#defines[name] = compute;
  }

  get(name: string): Cell<Value> | undefined {
    if (!(name in this.#computed)) {
      const compute = this.#defines[name];
      if (!compute) return undefined;
      this.#computed[name] = compute();
    }
    return this.#computed[name];
  }
}
