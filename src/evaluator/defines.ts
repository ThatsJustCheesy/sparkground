import { uniqueId } from "lodash";
import { Define } from "../expr/expr";

export class Defines<Value> {
  #defines: Record<string, [Define, (define: Define) => Value]> = {};
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

  addAll(entries: [define: Define, compute: (define: Define) => Value][]): void {
    for (const [define, compute] of entries) {
      this.add(define, compute);
    }
  }

  add(define: Define, compute: (define: Define) => Value): void {
    const { name } = define;
    const id = name.kind === "name-binding" ? name.id : uniqueId();
    this.#defines[id] = [define, compute];
  }

  has(define: Define): boolean {
    const { name } = define;
    if (name.kind !== "name-binding") return false;

    return name.id in this.#defines;
  }

  get(name: string): Value | undefined | "circular" {
    if (!(name in this.#computed)) {
      if (this.#computing.has(name)) {
        console.error(`Circular dependency for defined name: '${name}'`);
        return "circular";
      }

      if (!(name in this.#defines)) return undefined;
      const [define, compute] = this.#defines[name]!;

      this.#computing.add(name);
      try {
        this.#computed[name] = compute(define);
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
