/**
 * Maps keysets (sets of `Key`s) to values (`Value`s).
 *
 * Supports three main operations:
 *   - `addSingleton(k: Key, Value)`: adds a keyset-value pair, where the keyset is `{k}`
 *   - `union(Key, Key)`: merges two keyset-value pairs into a single one; keysets are
 *     merged by set union, and values via a user-provided `mergeValues()` function
 *   - `value(Key): Value`: returns the value associated with the given key
 *
 * This is a "disjoint sets" or "union-find" data structure that maintains
 * a separate, arbitrary value associated with each set, and where
 * the union operation merges the values associated with two such sets.
 */
export class DisjointSetsMap<Key, Value> {
  #nodes: Map<Key, Node<Key, Value>>;

  reset(): void {
    this.#nodes = new Map();
  }

  constructor(private mergeValues: (v1: Value, v2: Value) => Value) {
    this.reset();
  }

  clone(): DisjointSetsMap<Key, Value> {
    const clone = new DisjointSetsMap<Key, Value>(this.mergeValues);
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

    const [child, parent] = k1Rep.rank < k2Rep.rank ? [k1Rep, k2Rep] : [k2Rep, k1Rep];

    parent.value = this.mergeValues(child.value!, parent.value!);
    child.parent = parent;
    child.value = undefined;

    if (child.rank === parent.rank) {
      parent.rank += 1;
    }
  }

  value(key: Key): Value | undefined {
    const node = this.#nodes.get(key);
    if (!node) return undefined;
    return this.#representative(node).value;
  }

  /**
   * Finds the representative node for the set `child` is in.
   */
  #representative(child: Node<Key, Value>): Node<Key, Value> {
    if (child.parent) {
      // "Compress" the path from this node to the root; next time, access is faster
      child.parent = this.#representative(child.parent);
      return child.parent;
    }
    // Root of its tree, and therefore the representative
    return child;
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
