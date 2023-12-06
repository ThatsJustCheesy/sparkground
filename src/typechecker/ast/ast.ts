import { isHole } from "../../editor/ast/ast";

export type Expr =
  | Hole
  | NameBinding
  | NumberExpr
  | BoolExpr
  | StringExpr
  | NullExpr
  | Var
  | Call
  | Define
  | Let
  | Lambda
  | Sequence
  | If
  | Cond;

export type VarSlot = Hole | NameBinding;
export function getIdentifier(varSlot: VarSlot) {
  return isHole(varSlot) ? "_" : varSlot.id;
}

export type Hole = {
  kind: "hole";
};

export type NameBinding = {
  kind: "name-binding";
  id: string;
};

export type NumberExpr = {
  kind: "number";
  value: number;
};
export type BoolExpr = {
  kind: "bool";
  value: boolean;
};
export type StringExpr = {
  kind: "string";
  value: string;
};
export type NullExpr = {
  kind: "null";
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
