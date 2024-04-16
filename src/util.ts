import { useState } from "react";

export function callEach<Arg>(...fns: ((arg: Arg) => void)[]): (arg: Arg) => void {
  return (arg: Arg) => {
    fns.forEach((fn) => fn(arg));
  };
}

export type Prop<Value> = ReturnType<typeof useState<Value>>;
export type PropSetter<Value> = Prop<Value>[1];
