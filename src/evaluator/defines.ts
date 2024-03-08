export class Defines<Value> {
  #defines: Record<string, () => Value> = {};
  #computed: Record<string, Value> = {};
  #computing: Set<string> = new Set();

  addAll(entries: [name: string, compute: () => Value][]) {
    for (const [name, compute] of entries) {
      this.add(name, compute);
    }
  }

  add(name: string, compute: () => Value) {
    this.#defines[name] = compute;
  }

  get(name: string): Value | undefined | "circular" {
    if (!(name in this.#computed)) {
      if (this.#computing.has(name)) {
        console.error(`Circular dependency for defined name: '${name}'`);
        return "circular";
      }

      const compute = this.#defines[name];
      if (!compute) return undefined;

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
    return Object.keys(this.#defines);
  }

  computeAll(): void {
    this.names().forEach((name) => this.get(name));
  }

  clearComputed(): void {
    this.#computed = {};
  }
}
