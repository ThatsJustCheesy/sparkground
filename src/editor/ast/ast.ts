import { Tree } from "./trees";
import { isEqual } from "lodash";
import { Expr, Hole, Var } from "../../typechecker/ast/ast";

export function isAtomic(node: Expr) {
  return (["hole", "number", "bool", "string", "null", "var"] satisfies Expr["kind"][]).includes(
    node.kind as any
  );
}

export function children(expr: Expr): (Expr | undefined)[] {
  switch (expr.kind) {
    case "sexpr":
      return [expr.called, ...expr.args];
    case "define":
      return [expr.name, expr.value];
    case "let":
      throw "TODO";
    //   return [expr.bindings, expr.body]
    case "lambda":
      return [...expr.params, expr.body];
    case "sequence":
      return expr.exprs;
    case "if":
      return [expr.if, expr.then, expr.else];
    case "cond":
      throw "TODO";
    //   return [expr.cases];
    default:
      if (!isAtomic(expr)) throw `programmer error: unhandled expr kind ${expr.kind}!`;
      return [];
  }
}
export function childAtIndex(expr: Expr, index: number): Expr | undefined {
  return children(expr)[index];
}
export function setChildAtIndex(expr: Expr, index: number, newChild: Expr): void {
  switch (expr.kind) {
    case "sexpr":
      if (index === 0) expr.called = newChild;
      else expr.args[index - 1] = newChild;
      break;
    case "define":
      if (index === 0) expr.name = newChild as Var;
      if (index === 1) expr.value = newChild;
      break;
    case "let":
      throw "TODO";
    case "lambda":
      if (index < expr.params.length) expr.params[index] = newChild as Var;
      if (index === expr.params.length) expr.body = newChild;
      break;
    case "sequence":
      expr.exprs[index] = newChild;
      break;
    case "if":
      if (index === 0) expr.if = newChild;
      if (index === 1) expr.then = newChild;
      if (index === 2) expr.else = newChild;
      break;
    case "cond":
      throw "TODO";
    default:
      if (!isAtomic(expr)) throw `programmer error: unhandled expr kind ${expr.kind}!`;
      break;
  }
}

export const hole: Hole = { kind: "hole" };
export function isHole(expr: Expr): expr is Hole {
  return expr.kind === "hole";
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
  const [origRoot, origPath] = [root, path];

  path = [...path];
  while (path.length) {
    const index = path.shift()!;

    const child = childAtIndex(root, index);
    if (!child) {
      if (path.length) {
        console.error("invalid index path for tree", origRoot, origPath);
        throw "invalid index path for tree";
      } else {
        return { kind: "hole" };
      }
    }

    root = child;
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
