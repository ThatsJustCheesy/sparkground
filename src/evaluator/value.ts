import { BoolDatum, NumberDatum, StringDatum, SymbolDatum } from "../datum/datum";
import { Expr } from "../expr/expr";
import { DynamicFnSignature, DynamicType } from "./dynamic-type";
import { Builtin } from "./environment";
import { Evaluator } from "./evaluate";

export type Value = BoolDatum | NumberDatum | StringDatum | SymbolDatum | ListValue | FnValue;

export type ListValue = {
  kind: "list";
  heads: Value[];
  tail?: Value;
};

export type FnValue = {
  kind: "fn";
  signature: DynamicFnSignature;
  body: Builtin<Value, Value, Evaluator> | Expr;
};

export function dynamicTypeOfValue(value: Value): DynamicType {
  switch (value.kind) {
    case "bool":
      return "Boolean";
    case "number":
      return "Number";
    case "string":
      return "String";
    case "symbol":
      return "Symbol";
    case "list":
      return "List";
    case "fn":
      return "Function";
  }
}

export function valueAsBool(value: Value): boolean {
  switch (value.kind) {
    case "bool":
      return value.value;
    case "number":
      return value.value !== 0;
    case "string":
      return value.value.length > 0;
    case "symbol":
      return true;
    case "list":
      return value.heads.length > 0 || value.tail !== undefined;
    case "fn":
      return true;
  }
}

export function vectorNormalizeListValue(list: ListValue): ListValue | undefined {
  const asVector = listValueAsVector(list);
  if (asVector === undefined) return undefined;

  return {
    kind: "list",
    heads: asVector,
  };
}

export function listValueAsVector(list: ListValue): Value[] | undefined {
  if (!list.tail) return list.heads;
  if (list.tail.kind !== "list") return undefined;

  const tailAsVector = listValueAsVector(list.tail);
  if (tailAsVector === undefined) return undefined;

  return [...list.heads, ...tailAsVector];
}

export function consNormalizeListValue(list: ListValue): ListValue {
  const last: ListValue = { kind: "list", heads: [] };
  let head: ListValue = last;

  let cur = list;
  while (true) {
    if (cur.heads.length) {
      head = { kind: "list", heads: [cur.heads.shift()!], tail: head };
    } else {
      if (cur.tail?.kind === "list") {
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
