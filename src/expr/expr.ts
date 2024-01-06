import { isHole } from "../editor/trees/tree";
import { Datum } from "../datum/datum";
import { DefinitionAttributes } from "./attributes";

export type Expr = { attributes?: DefinitionAttributes } & (
  | NameBinding
  | Datum
  | Var
  | Call
  | Define
  | Let
  | Lambda
  | Sequence
  | If
  | Cond
);

export type Hole = {
  kind: "symbol";
  value: "·";
};
export type VarSlot = Hole | NameBinding;
export function getIdentifier(varSlot: VarSlot) {
  return isHole(varSlot) ? "·" : varSlot.id;
}

export type NameBinding = {
  kind: "name-binding";
  id: string;
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
export type Lambda = {
  kind: "lambda";
  params: VarSlot[];
  body: Expr;
};
export type Sequence = {
  kind: "sequence";
  exprs: Expr[];
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