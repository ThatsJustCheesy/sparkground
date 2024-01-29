import { BoolDatum, NumberDatum, StringDatum, SymbolDatum } from "../datum/datum";
import { Expr } from "../expr/expr";
import { Builtin } from "./environment";

export type Value = BoolDatum | NumberDatum | StringDatum | SymbolDatum | ListValue | FnValue;

export type ListValue = {
  kind: "list";
  heads: Value[];
  tail?: Value;
};

export type FnValue = {
  kind: "fn";
  params: string[];
  body: Builtin<Value, Value> | Expr;
};

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
