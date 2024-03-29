export class Defines<Value> {
  #defines: Record<string, () => Value> = {};
  #computed: Record<string, Value> = {};
  #computing: Set<string> = new Set();

  constructor() {
    this.clear();
  }

  clear(): void {
    this.#defines = {};
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

  add(identifier: string, compute: () => Value): void {
    this.#defines[identifier] = compute;
  }

  has(identifier: string): boolean {
    return identifier in this.#defines;
  }

  get(name: string): Value | undefined | "circular" {
    if (!(name in this.#computed)) {
      if (this.#computing.has(name)) {
        console.error(`Circular dependency for defined name: '${name}'`);
        return "circular";
      }

      if (!(name in this.#defines)) return undefined;
      const compute = this.#defines[name]!;

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
}
