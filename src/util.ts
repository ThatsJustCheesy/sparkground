import { range, zip } from "lodash";
import { useState } from "react";

export function callEach<Arg>(...fns: ((arg: Arg) => void)[]): (arg: Arg) => void {
  return (arg: Arg) => {
    fns.forEach((fn) => fn(arg));
  };
}

export type Prop<Value> = ReturnType<typeof useState<Value>>;
export type PropSetter<Value> = Prop<Value>[1];

/**
 * Yields each item of `iterable`, collecting the results given by the caller
 * into an array, and returns the array of results.
 */
export function* collect<T, TNext>(
  iterable: Iterable<T>,
): Generator</* yields */ T, /* returns */ TNext[], /* accepts */ TNext> {
  const results: TNext[] = [];
  for (const item of iterable) {
    results.push(yield item);
  }
  return results;
}

export function withIndices<T>(items: T[]): [T, number][] {
  return zip(items, range(items.length)) as [T, number][];
}
