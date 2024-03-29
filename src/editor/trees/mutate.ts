import { cloneDeep } from "lodash";
import {
  TreeIndexPath,
  nodeAtIndexPath as nodeAtIndexPath,
  hole,
  isSameOrAncestor,
  setChildAtIndex,
  isAtomic,
  isHoleForEditor,
} from "./tree";
import { PageID, Point, Tree, globalMeta, newTree, removeTree } from "./trees";
import { Expr } from "../../expr/expr";
import { TypeVar, isTypeNameBinding } from "../../typechecker/type";

function destinationPageID(proposal: PageID): PageID {
  return proposal >= 0 ? proposal : globalMeta.currentPageID ?? 0;
}

export function moveExprInTree(
  { tree: sourceTree, path: sourceIndexPath }: TreeIndexPath,
  { tree: destinationTree, path: destinationIndexPath }: TreeIndexPath,
  displaceTo: Point
) {
  if (destinationIndexPath.length === 0) {
    // Trying to replace root of a tree
    return;
  }
  if (
    isSameOrAncestor(
      { tree: sourceTree, path: sourceIndexPath },
      { tree: destinationTree, path: destinationIndexPath }
    )
  ) {
    // Trying to move an expression such that it becomes a descendant of itself
    return;
  }

  const source = nodeForIndexPathInTree(sourceTree, sourceIndexPath);

  const destination = nodeForIndexPathInTree(destinationTree, destinationIndexPath);
  const destinationParent = nodeForIndexPathInTree(
    destinationTree,
    destinationIndexPath.slice(0, -1)
  );

  if (source === sourceTree.root) {
    removeTree(sourceTree);
  } else {
    const sourceParent = nodeForIndexPathInTree(sourceTree, sourceIndexPath.slice(0, -1));

    setChildAtIndex(sourceParent, sourceIndexPath.at(-1)!, hole);
  }

  setChildAtIndex(destinationParent, destinationIndexPath.at(-1)!, source);
  if (!isHoleForEditor(destination)) {
    newTree(destination, displaceTo, destinationPageID(destinationTree.page));
  }
}

export function copyExprInTree(
  { tree: sourceTree, path: sourceIndexPath }: TreeIndexPath,
  { tree: destinationTree, path: destinationIndexPath }: TreeIndexPath,
  displaceTo: Point
) {
  if (destinationIndexPath.length === 0) {
    // Trying to replace root of a tree
    return;
  }

  const source = nodeForIndexPathInTree(sourceTree, sourceIndexPath);

  const destination = nodeForIndexPathInTree(destinationTree, destinationIndexPath);
  const destinationParent = nodeForIndexPathInTree(
    destinationTree,
    destinationIndexPath.slice(0, -1)
  );

  if (destination === source || destination === destinationTree.root) return;

  setChildAtIndex(destinationParent, destinationIndexPath.at(-1)!, cloneExpr(source));
  if (!isHoleForEditor(destination)) {
    newTree(destination, displaceTo, destinationPageID(destinationTree.page));
  }
}

export function orphanExpr({ tree, path }: TreeIndexPath, placeAt: Point, copy: boolean): Tree {
  const expr = nodeForIndexPathInTree(tree, path);
  if (isHoleForEditor(expr)) return tree;

  const parent = nodeForIndexPathInTree(tree, path.slice(0, -1));

  if (copy) {
    return newTree(cloneExpr(expr), placeAt, destinationPageID(tree.page));
  }

  if (path.length === 0 || isAtomic(parent)) {
    // expr is already the root of a tree
    tree.location = placeAt;
    return tree;
  }

  setChildAtIndex(parent, path.at(-1)!, hole);
  return newTree(expr, placeAt, destinationPageID(tree.page));
}

export function deleteExpr({ tree, path }: TreeIndexPath) {
  const expr = nodeForIndexPathInTree(tree, path);
  if (isHoleForEditor(expr)) return;

  const exprParent = nodeForIndexPathInTree(tree, path.slice(0, -1));

  if (path.length === 0 || isAtomic(exprParent)) {
    // expr is the root of its tree
    removeTree(tree);
  } else {
    setChildAtIndex(exprParent, path.at(-1)!, hole);
  }
}

export function replaceExpr(indexPath: TreeIndexPath, newNode: Expr) {
  if (!indexPath.path.length) {
    indexPath.tree.root = newNode;
  } else {
    setChildAtIndex(
      nodeAtIndexPath({
        tree: indexPath.tree,
        path: indexPath.path.slice(0, -1),
      }),
      indexPath.path.at(-1)!,
      newNode
    );
  }
}

function nodeForIndexPathInTree(tree: Tree, path: number[]): Expr {
  return nodeAtIndexPath({ tree, path });
}

function cloneExpr(expr: Expr): Expr {
  let clone = cloneDeep(expr);
  switch (clone.kind) {
    case "name-binding":
      clone = { ...clone, kind: "var" };
      break;
    case "type": {
      const { type } = clone;
      if (isTypeNameBinding(type)) {
        clone = {
          ...clone,
          type: {
            var: type.id,
          } satisfies TypeVar,
        };
      }
    }
  }
  return clone;
}
