import { Key } from "react";
import { ProgSymbol } from "../symbol-table";
import { Tree } from "./trees";
import { isEqual } from "lodash";

export type Expr = SExpr | ProgSymbol | Literal | Hole;

export type SExpr = {
  called: Expr;
  args: Expr[];
};
export function isSExpr(expr: Expr): expr is SExpr {
  return typeof expr === "object" && expr !== null && "called" in expr;
}
export function childAtIndex(sExpr: SExpr, index: number): Expr {
  return index === 0 ? sExpr.called : sExpr.args[index - 1];
}
export function setChildAtIndex(sExpr: SExpr, index: number, newChild: Expr): void {
  if (index === 0) sExpr.called = newChild;
  else sExpr.args[index - 1] = newChild;
}
export function s(...list: Expr[]) {
  const [called, ...args] = list;
  return { called, args };
}

export function isProgSymbol(expr: Expr): expr is ProgSymbol {
  return typeof expr === "object" && expr !== null && "id" in expr;
}

export type Literal = NumericLiteral | BoolLiteral | QuoteLiteral;

export type NumericLiteral = { n: number };
export function isNumericLiteral(expr: Expr): expr is NumericLiteral {
  return typeof expr === "object" && expr !== null && "n" in expr;
}

export type BoolLiteral = boolean;
export function isBoolLiteral(expr: Expr): expr is BoolLiteral {
  return typeof expr === "boolean";
}

export type QuoteLiteral = null | {
  quote: SExpr;
};
export function isQuoteLiteral(expr: Expr): expr is QuoteLiteral {
  return expr === null || (typeof expr === "object" && "quote" in expr);
}

export type Hole = undefined;
export const hole = undefined;
export function isHole(expr: Expr): expr is Hole {
  return expr === undefined;
}

// TODO: Repurpose or remove
export function uniqueKeyForExpr(expr: Expr): Key {
  if (isSExpr(expr))
    return (
      uniqueKeyForExpr(expr.called) + " " + expr.args.map((arg) => uniqueKeyForExpr(arg)).join(" ")
    );
  if (isProgSymbol(expr)) return expr.id;
  if (isNumericLiteral(expr)) return expr.n;
  if (isQuoteLiteral(expr))
    return expr === null ? "(null)" : "(quote " + uniqueKeyForExpr(expr.quote) + ")";
  throw "invalid expression";
}

export type TreeIndexPath = {
  tree: Tree;
  path: number[];
};
export function rootIndexPath(tree: Tree): TreeIndexPath {
  return {
    tree,
    path: [],
  };
}
export function extendIndexPath({ tree, path }: TreeIndexPath, extension: number) {
  return {
    tree,
    path: [...path, extension],
  };
}
export function exprAtIndexPath({ tree: { root }, path }: TreeIndexPath): Expr {
  path = [...path];
  while (path.length) {
    if (!isSExpr(root)) throw "invalid index path for tree";

    const index = path.shift()!;
    root = childAtIndex(root, index);
  }

  return root;
}
export function isAncestor(ancestor: TreeIndexPath, descendant: TreeIndexPath): boolean {
  if (descendant.tree !== ancestor.tree) return false;
  if (descendant.path.length <= ancestor.path.length) return false;

  for (let i = 0; i < ancestor.path.length; ++i) {
    if (descendant.path[i] !== ancestor.path[i]) return false;
  }
  return true;
}
export function isSameOrAncestor(ancestor: TreeIndexPath, descendant: TreeIndexPath): boolean {
  return (
    (ancestor.tree === descendant.tree && isEqual(ancestor.path, descendant.path)) ||
    isAncestor(ancestor, descendant)
  );
}
