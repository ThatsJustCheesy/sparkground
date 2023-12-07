import { Expr } from "../typechecker/ast/ast";
import { Environment } from "./evaluate";

export type Value = Fn | List | number | boolean | string;

type Builtin = (env: Environment) => Value;

export type Fn = {
  params: string[];
  body: Builtin | Expr;
};
export function isFn(value: Value): value is Fn {
  return typeof value === "object" && "params" in value;
}

export type List = Value[];
export function isList(value: Value): value is List {
  return Array.isArray(value);
}

export function valueAsBool(value: Value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string" || Array.isArray(value)) return value.length > 0;
  return true;
}
