import { Tree } from "./trees";
import { isEqual } from "lodash";
import { Expr, Hole, NameBinding, Var, VarSlot } from "../../expr/expr";
import { Datum } from "../../datum/datum";
import { serializeExpr } from "./serialize";
import { Parser as DatumParser } from "../../datum/parse";
import { Any, Type, hasTag, isTypeVar } from "../../typechecker/type";
import { Parser as TypeParser } from "../../typechecker/parse";
import { Parser as ExprParser } from "../../expr/parse";
import { flattenDatum } from "../../datum/flattened";

export function isAtomic(node: Expr) {
  return (["number", "bool", "string", "symbol", "var"] satisfies Expr["kind"][]).includes(
    node.kind as any
  );
}

export function children(node: Expr): (Expr | undefined)[] {
  switch (node.kind) {
    // Datum
    case "list":
      return [node.tail, ...node.heads];

    // Type
    case "type": {
      const type = node.type;

      if (!type) return [];
      if (isTypeVar(type)) return [];
      if (!type.of) return [];

      return type.of.map((type) => ({ kind: "type", type }));
    }

    // Expr
    case "name-binding":
      return node.type ? [{ kind: "type", type: node.type }] : [];
    case "call":
      return [node.called, ...node.args];
    case "define":
      return [node.name, node.value];
    case "let":
    case "letrec":
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

export function childAtIndex(node: Expr, index: number): Expr | undefined {
  return children(node)[index];
}

export function setChildAtIndex(node: Expr, index: number, newChild: Expr): void {
  switch (node.kind) {
    // Datum
    case "list":
      if (index === 0) node.tail = asDatum(newChild);
      else node.heads[index - 1] = asDatum(newChild);
      break;

    // Type
    case "type": {
      const type = node.type;
      if (isTypeVar(type)) break;

      type.of ??= [];
      type.of[index] = asType(newChild);
      break;
    }

    // Expr
    case "name-binding":
      if (index === 0) node.type = asType(newChild);
      break;
    case "call":
      if (index === 0) node.called = newChild;
      else node.args[index - 1] = newChild;
      break;
    case "define":
      if (index === 0) node.name = asVarSlot(newChild);
      if (index === 1) node.value = newChild;
      break;
    case "let":
    case "letrec":
      if (index < 2 * node.bindings.length) {
        const binding = node.bindings[Math.floor(index / 2)]!;
        binding[index % 2] = newChild;
      }
      if (index === 2 * node.bindings.length) node.body = newChild;
      break;
    case "lambda":
      if (index < node.params.length) node.params[index] = asVarSlot(newChild);
      if (index === node.params.length) node.body = newChild;
      break;
    case "sequence":
      node.exprs[index] = newChild;
      break;
    case "if":
      if (index === 0) node.if = newChild;
      if (index === 1) node.then = newChild;
      if (index === 2) node.else = newChild;
      break;
    case "cond":
      throw "TODO";

    default:
      if (!isAtomic(node)) throw `programmer error: unhandled expr kind ${node.kind}!`;
      break;
  }
}

function asDatum(node: Expr): Datum {
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
      // Serialize the expression, then parse it back
      // Bit of a hack, but it should work
      return DatumParser.parseToDatum(serializeExpr(node));
  }
}

function asType(node: Expr): Type {
  switch (node.kind) {
    // Type
    case "type":
      return node.type;

    // Expr
    default:
      if (isHole(node)) return Any;

      // Serialize the expression, then parse it back
      // Bit of a hack, but it should work
      return TypeParser.parseToType(serializeExpr(node));
  }
}

function asVarSlot(node: Expr): VarSlot {
  if (isHole(node) || node.kind === "name-binding") return node;

  // Once again: Serialize the expression, then parse it back
  return new ExprParser().parseVarSlot(flattenDatum(asDatum(node)));
}

export const hole: Hole = { kind: "symbol", value: "·" };
export function isHole(node: Expr | undefined): node is Hole {
  return node?.kind === "symbol" && node.value === "·";
}
export function isHoleForEditor(node: Expr | undefined): boolean {
  return isHole(node) || (node?.kind === "type" && hasTag(node.type, "Any"));
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
export function parentIndexPath({ tree, path }: TreeIndexPath) {
  return {
    tree,
    path: path.slice(0, -1),
  };
}
export function nodeAtIndexPath({ tree: { root }, path }: TreeIndexPath): Expr {
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

export function referencesToBinding(id: string, root: TreeIndexPath): Var[] {
  return children(nodeAtIndexPath(root)).flatMap((child, childIndex) => {
    if (!child) return [];
    const childIndexPath = extendIndexPath(root, childIndex);

    switch (child.kind) {
      case "var":
        if (child.id === id) {
          return [child];
        }
        break;
      case "lambda":
        if (child.params.some((slot) => slot.kind === "name-binding" && slot.id === id)) {
          // Shadowed
          return [];
        }
        break;
      case "let":
      case "letrec": // FIXME: not right for letrec
        if (child.bindings.some(([slot]) => slot.kind === "name-binding" && slot.id === id)) {
          // Shadowed
          return [];
        }
        break;
    }

    return referencesToBinding(id, childIndexPath);
  });
}
