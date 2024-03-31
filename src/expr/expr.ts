import { isHole } from "../editor/trees/tree";
import { Datum } from "../datum/datum";
import { DefinitionAttributes } from "./attributes";
import { Type } from "../typechecker/type";
import { uniqueId } from "lodash";

export type Expr = { attributes?: DefinitionAttributes } & (
  | NameBinding
  | Datum
  | TypeExpr
  | Var
  | Call
  | Struct
  | Define
  | Let
  | Letrec
  | Lambda
  | Sequence
  | And
  | Or
  | If
  | Cond
);

export type Hole = {
  kind: "Symbol";
  value: "·";
};
export type VarSlot = Hole | NameBinding;
export function getIdentifier(varSlot: VarSlot) {
  return isHole(varSlot) ? uniqueId() : varSlot.id;
}
export function getPrettyName(varSlot: VarSlot) {
  return isHole(varSlot) ? varSlot.value : varSlot.id;
}
export function getTypeAnnotation(varSlot: VarSlot): Type | undefined {
  return isHole(varSlot) ? undefined : varSlot.type;
}

export type NameBinding = {
  kind: "name-binding";
  id: string;
  type?: Type;
};

export type TypeExpr = {
  kind: "type";
  type: Type;
};

export type Struct = {
  kind: "struct";
  name: VarSlot;
  fields: VarSlot[];
};

export type Var = {
  kind: "var";
  id: string;
};

export type Call = {
  kind: "call";
  called: Expr;
  args: Expr[];
};

export type Define = {
  kind: "define";
  name: VarSlot;
  value: Expr;
};

export type Let = {
  kind: "let";
  bindings: [name: VarSlot, value: Expr][];
  body: Expr;
};
export type Letrec = {
  kind: "letrec";
  bindings: [name: VarSlot, value: Expr][];
  body: Expr;
};

export type Lambda = {
  kind: "lambda";
  params: VarSlot[];
  body: Expr;
};

export type Sequence = {
  kind: "sequence";
  exprs: Expr[];
};

export type And = {
  kind: "and";
  args: Expr[];
};
export type Or = {
  kind: "or";
  args: Expr[];
};
export type If = {
  kind: "if";
  if: Expr;
  then: Expr;
  else: Expr;
};
export type Cond = {
  kind: "cond";
  cases: [condition: Expr, value: Expr][];
};
