import { Tree } from "./trees";
import { isEqual } from "lodash";
import { Expr, Hole, NameBinding } from "../../expr/expr";
import { Datum } from "../../datum/datum";
import { serializeExpr } from "./serialize";
import { Parser as DatumParser } from "../../datum/parse";

export function isAtomic(node: Expr | Datum) {
  return (
    ["number", "bool", "string", "symbol", "var", "name-binding"] satisfies (Expr | Datum)["kind"][]
  ).includes(node.kind as any);
}

export function children(node: Expr | Datum): (Expr | Datum | undefined)[] {
  switch (node.kind) {
    // Datum
    case "list":
      return [node.tail, ...node.heads];

    // Expr
    case "quote":
      return [node.value];
    case "call":
      return [node.called, ...node.args];
    case "define":
      return [node.name, node.value];
    case "let":
      return [...node.bindings.flat(1), node.body];
    case "lambda":
      return [...node.params, node.body];
    case "sequence":
      return node.exprs;
    case "if":
      return [node.if, node.then, node.else];
    case "cond":
      throw "TODO";
    //   return [expr.cases];
    default:
      if (!isAtomic(node)) throw `programmer error: unhandled expr kind ${node.kind}!`;
      return [];
  }
}

export function childAtIndex(node: Expr | Datum, index: number): Expr | Datum | undefined {
  return children(node)[index];
}

export function setChildAtIndex(node: Expr | Datum, index: number, newChild: Expr | Datum): void {
  switch (node.kind) {
    // Datum
    case "list":
      if (index === 0) node.tail = asDatum(newChild);
      else node.heads[index - 1] = asDatum(newChild);
      break;

    // Expr
    case "quote":
      if (index === 0) node.value = asDatum(newChild);
      break;
    case "call":
      if (index === 0) node.called = asExpr(newChild);
      else node.args[index - 1] = asExpr(newChild);
      break;
    case "define":
      if (index === 0) node.name = asExpr(newChild) as NameBinding;
      if (index === 1) node.value = asExpr(newChild);
      break;
    case "let":
      if (index < 2 * node.bindings.length) {
        const binding = node.bindings[Math.floor(index / 2)];
        binding[index % 2] = asExpr(newChild);
      }
      if (index === 2 * node.bindings.length) node.body = asExpr(newChild);
      break;
    case "lambda":
      if (index < node.params.length) node.params[index] = asExpr(newChild) as NameBinding;
      if (index === node.params.length) node.body = asExpr(newChild);
      break;
    case "sequence":
      node.exprs[index] = asExpr(newChild);
      break;
    case "if":
      if (index === 0) node.if = asExpr(newChild);
      if (index === 1) node.then = asExpr(newChild);
      if (index === 2) node.else = asExpr(newChild);
      break;
    case "cond":
      throw "TODO";

    default:
      if (!isAtomic(node)) throw `programmer error: unhandled expr kind ${node.kind}!`;
      break;
  }
}

function asDatum(node: Expr | Datum): Datum {
  switch (node.kind) {
    // Datum
    case "bool":
    case "number":
    case "string":
    case "symbol":
    case "list":
      return node;

    // Expr
    default:
      // Bit of a hack, but it should work...?
      return DatumParser.parseToDatum(serializeExpr(node));
  }
}
function asExpr(node: Expr | Datum): Expr {
  if (isHole(node)) return node;

  switch (node.kind) {
    case "symbol":
    case "list":
      return {
        kind: "quote",
        value: node,
      };
    default:
      return node;
  }
}

export const hole: Hole = { kind: "symbol", value: "·" };
export function isHole(node: Expr | Datum | undefined): node is Hole {
  return node?.kind === "symbol" && node.value === "·";
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
export function nodeAtIndexPath({ tree: { root }, path }: TreeIndexPath): Expr | Datum {
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
        return hole;
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
