import { Tree } from "./trees";
import { isEqual } from "lodash";
import { Expr, Hole, TypeExpr, Var, VarSlot } from "../../expr/expr";
import { Datum } from "../../datum/datum";
import { serializeExpr } from "./serialize";
import { Parser as DatumParser } from "../../datum/parse";
import {
  Type,
  TypeVarSlot,
  Untyped,
  hasTag,
  isForallType,
  isTypeNameHole,
  isTypeVar,
  isTypeVarSlot,
} from "../../typechecker/type";
import { Parser as TypeParser } from "../../typechecker/parse";
import { Parser as ExprParser } from "../../expr/parse";
import { flattenDatum } from "../../datum/flattened";
import { Environment, extendEnv } from "../library/environments";
import { serializeType } from "../../typechecker/serialize";

export function isAtomic(node: Expr) {
  return (["Number", "Boolean", "String", "Symbol", "var"] satisfies Expr["kind"][]).includes(
    node.kind as any
  );
}

export function children(node: Expr): (Expr | undefined)[] {
  switch (node.kind) {
    // Datum
    case "List":
      return [node.tail, ...node.heads];

    // Type
    case "type": {
      const type = node.type;

      const wrapTypeAsExpr = (type: Type): TypeExpr => ({ kind: "type", type });

      if (!type || isTypeVar(type) || isTypeVarSlot(type)) {
        return [];
      } else if (isForallType(type)) {
        return [...type.forall.map(wrapTypeAsExpr), wrapTypeAsExpr(type.body)];
      } else {
        return type.of ? type.of.map(wrapTypeAsExpr) : [];
      }
    }

    // Expr
    case "name-binding":
      return node.type ? [{ kind: "type", type: node.type }] : [];
    case "call":
      return [node.called, ...node.args];
    case "struct":
      return [node.name, ...node.fields];
    case "define":
      return [node.name, node.value];
    case "let":
    case "letrec":
      return [...node.bindings.flat(1), node.body];
    case "lambda":
      return [...node.params, hole, node.body];
    case "sequence":
      return node.exprs;
    case "and":
    case "or":
      return [...node.args];
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
    case "List":
      if (index === 0) node.tail = asDatum(newChild);
      else node.heads[index - 1] = asDatum(newChild);
      break;

    // Type
    case "type": {
      const type = node.type;
      if (isTypeVar(type) || isTypeVarSlot(type)) break;

      if (isForallType(type)) {
        if (index < type.forall.length) type.forall[index] = asTypeVarSlot(newChild);
        else type.body = asType(newChild);
      } else {
        // Concrete type
        type.of ??= [];
        type.of[index] = asType(newChild);
      }
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
    case "struct":
      if (index === 0) node.name = asVarSlot(newChild);
      else node.fields[index - 1] = asVarSlot(newChild);
      node.fields = node.fields.filter((field) => !isHole(field));
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
      if (index <= node.params.length) node.params[index] = asVarSlot(newChild);
      if (index === node.params.length + 1) node.body = newChild;
      node.params = node.params.filter((param) => !isHole(param));
      break;
    case "sequence":
      node.exprs[index] = newChild;
      break;
    case "and":
    case "or":
      node.args[index] = newChild;
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
    case "Boolean":
    case "Number":
    case "String":
    case "Symbol":
    case "List":
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
      if (isHole(node)) return Untyped;

      // Serialize the expression, then parse it back
      // Bit of a hack, but it should work
      return TypeParser.parseToType(serializeExpr(node));
  }
}

function asTypeVarSlot(node: Expr): TypeVarSlot {
  const type = asType(node);

  if (isTypeVarSlot(type)) return type;

  // Once again: Serialize the expression, then parse it back
  return new TypeParser().parseTypeVarSlot(
    flattenDatum(DatumParser.parseToDatum(serializeType(type)))
  );
}

function asVarSlot(node: Expr): VarSlot {
  if (isHole(node) || node.kind === "name-binding") return node;

  // Once again: Serialize the expression, then parse it back
  return new ExprParser().parseVarSlot(flattenDatum(asDatum(node)));
}

export const hole: Hole = { kind: "Symbol", value: "·" };
export function isHole(node: Expr | undefined): node is Hole {
  return node?.kind === "Symbol" && node.value === "·";
}
export function isHoleForEditor(node: Expr | undefined): boolean {
  return (
    isHole(node) ||
    (node?.kind === "type" && (isTypeNameHole(node.type) || hasTag(node.type, Untyped.tag)))
  );
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

/**
 * Returns all unbound (free) variable references in the expression at `root`
 * with contextual bindings in `env`.
 */
export function unboundReferences(root: TreeIndexPath, env: Environment = {}): Var[] {
  const parent = nodeAtIndexPath(root);

  if (parent.kind === "var") {
    return env[parent.id] ? [] : [parent];
  }

  return children(nodeAtIndexPath(root)).flatMap((child, childIndex): Var[] => {
    if (!child) return [];
    const childIndexPath = extendIndexPath(root, childIndex);

    switch (parent.kind) {
      case "lambda":
        if (childIndex < parent.params.length) {
          return unboundReferences(childIndexPath, env);
        } else {
          return unboundReferences(childIndexPath, extendEnv(env, root, parent.params));
        }

      case "define":
        return unboundReferences(childIndexPath, extendEnv(env, root, [parent.name]));

      case "let":
        if (childIndex < 2 * parent.bindings.length) {
          return unboundReferences(childIndexPath, env);
        } else {
          return unboundReferences(
            childIndexPath,
            extendEnv(
              env,
              root,
              parent.bindings.map(([name]) => name)
            )
          );
        }

      case "letrec":
        return unboundReferences(
          childIndexPath,
          extendEnv(
            env,
            root,
            parent.bindings.map(([name]) => name)
          )
        );

      default:
        return unboundReferences(childIndexPath, env);
    }
  });
}
