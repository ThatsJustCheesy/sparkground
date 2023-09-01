export class DisjointMaps<Key, Value> {
  #nodes: Map<Key, Node<Key, Value>>;

  reset(): void {
    this.#nodes = new Map();
  }

  constructor(private mergeValues: (v1: Value, v2: Value) => Value) {
    this.reset();
  }

  clone(): DisjointMaps<Key, Value> {
    const clone = new DisjointMaps<Key, Value>(this.mergeValues);
    clone.#nodes = new Map(this.#nodes);
    return clone;
  }

  addSingleton(key: Key, value: Value): void {
    this.#addSingleton(key, value);
  }

  #addSingleton(key: Key, value: Value): Node<Key, Value> {
    const newRoot: Node<Key, Value> = { key, value, rank: 0 };
    this.#nodes.set(key, newRoot);
    return newRoot;
  }

  #node(key: Key): Node<Key, Value> {
    const node = this.#nodes.get(key);
    if (!node) throw `programmer error: no value for key ${key} in any set!`;
    return node;
  }

  union(k1: Key, k2: Key): void {
    let k1Rep = this.#representative(this.#node(k1));
    let k2Rep = this.#representative(this.#node(k2));

    if (k1Rep.rank < k2Rep.rank) {
      [k1Rep, k2Rep] = [k2Rep, k1Rep];
    }

    k1Rep.parent = k2Rep;
    k2Rep.value = this.mergeValues(k1Rep.value!, k2Rep.value!);
    k1Rep.value = undefined;

    if (k1Rep.rank === k2Rep.rank) {
      k2Rep.rank += 1;
    }
  }

  representative(key: Key): Value | undefined {
    const node = this.#nodes.get(key);
    if (!node) return undefined;
    return this.#representative(node).value;
  }

  #representative(needle: Node<Key, Value>): Node<Key, Value> {
    if (needle.parent) {
      // console.error(needle.parent.value, needle.value);
      needle.parent = this.#representative(needle.parent);
      return needle.parent;
    }
    return needle;
  }

  dump(): void {
    console.log(this.#nodes);
  }
}

type Node<Key, Value> = {
  parent?: Node<Key, Value>;
  key: Key;
  value?: Value;
  rank: number;
};
