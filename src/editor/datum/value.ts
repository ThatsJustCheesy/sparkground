import { Expr } from "../../typechecker/ast/ast";
import { Builtin } from "../../evaluator/environment";

export type Value = BoolValue | NumberValue | StringValue | SymbolValue | ListValue | FnValue;

export type BoolValue = {
  kind: "bool";
  value: boolean;
};
export type NumberValue = {
  kind: "number";
  value: number;
};
export type StringValue = {
  kind: "string";
  value: string;
};

export type SymbolValue = {
  kind: "symbol";
  value: string;
};

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
