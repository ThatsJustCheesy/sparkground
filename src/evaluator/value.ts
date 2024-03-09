import { BoolDatum, NumberDatum, StringDatum, SymbolDatum } from "../datum/datum";
import { Environment } from "../editor/library/environments";
import { Expr } from "../expr/expr";
import { DynamicFnSignature } from "./dynamic-type";
import { Evaluator } from "./evaluate";

export type Value = BoolDatum | NumberDatum | StringDatum | SymbolDatum | ListValue | FnValue;

export type ListValue = {
  kind: "List";
  heads: Value[];
  tail?: Value;
};

export type FnValue = {
  kind: "fn";
  signature: DynamicFnSignature;
  body: BuiltinFn | Expr;
  env?: Environment;
};

export type BuiltinFn = (args: Value[], evaluator: Evaluator) => Value;

export function valueAsBool(value: Value): boolean {
  switch (value.kind) {
    case "Boolean":
      return value.value;
    case "Number":
      return value.value !== 0;
    case "String":
      return value.value.length > 0;
    case "Symbol":
      return true;
    case "List":
      return value.heads.length > 0 || value.tail !== undefined;
    case "fn":
      return true;
  }
}

export function vectorNormalizeListValue(list: ListValue): ListValue | undefined {
  const asVector = listValueAsVector(list);
  if (asVector === undefined) return undefined;

  return {
    kind: "List",
    heads: asVector,
  };
}

export function listValueAsVector(list: ListValue): Value[] | undefined {
  if (!list.tail) return list.heads;
  if (list.tail.kind !== "List") return undefined;

  const tailAsVector = listValueAsVector(list.tail);
  if (tailAsVector === undefined) return undefined;

  return [...list.heads, ...tailAsVector];
}

export function consNormalizeListValue(list: ListValue): ListValue {
  const last: ListValue = { kind: "List", heads: [] };
  let head: ListValue = last;

  let cur = list;
  while (true) {
    if (cur.heads.length) {
      head = { kind: "List", heads: [cur.heads.shift()!], tail: head };
    } else {
      if (cur.tail?.kind === "List") {
        cur = cur.tail;
      } else {
        last.tail = cur.tail;
        return head;
      }
    }
  }
}

export function getVariadic<T extends Value>(nonvariadic: number, args: Value[]): T[] {
  return args.slice(nonvariadic) as T[];
}
