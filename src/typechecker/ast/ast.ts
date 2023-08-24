export type Expr =
  | NumberExpr
  | BoolExpr
  | StringExpr
  | NullExpr
  | Var
  | SExpr
  | Define
  | Let
  | Lambda
  | Sequence
  | If
  | Cond;

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

export type SExpr = {
  kind: "sexpr";
  called: Expr;
  args: Expr[];
};

export type Define = {
  kind: "define";
  name: string;
  value: Expr;
};
export type Let = {
  kind: "let";
  bindings: [name: string, value: Expr][];
  body: Expr;
};
export type Lambda = {
  kind: "lambda";
  params: string[];
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
