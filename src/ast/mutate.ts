import { cloneDeep } from "lodash";
import {
  Expr,
  TreeIndexPath,
  exprAtIndexPath,
  hole,
  isHole,
  isSExpr,
  isSameOrAncestor,
  setChildAtIndex,
} from "./ast";
import { Point, Tree, newTree, removeTree } from "./trees";

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

  const source = exprForIndexPathInTree(sourceTree, sourceIndexPath);

  const destination = exprForIndexPathInTree(destinationTree, destinationIndexPath);
  const destinationParent = exprForIndexPathInTree(
    destinationTree,
    destinationIndexPath.slice(0, -1)
  );
  if (!isSExpr(destinationParent)) throw "invalid index path for tree";

  if (source === sourceTree.root) {
    removeTree(sourceTree);
  } else {
    const sourceParent = exprForIndexPathInTree(sourceTree, sourceIndexPath.slice(0, -1));
    if (!isSExpr(sourceParent)) throw "invalid index path for tree";

    setChildAtIndex(sourceParent, sourceIndexPath.at(-1)!, hole);
  }

  setChildAtIndex(destinationParent, destinationIndexPath.at(-1)!, source);
  if (!isHole(destination)) newTree(destination, displaceTo);
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

  const source = exprForIndexPathInTree(sourceTree, sourceIndexPath);
  if (source === sourceTree.root) {
    removeTree(sourceTree);
  }

  const destination = exprForIndexPathInTree(destinationTree, destinationIndexPath);
  const destinationParent = exprForIndexPathInTree(
    destinationTree,
    destinationIndexPath.slice(0, -1)
  );
  if (!isSExpr(destinationParent)) throw "invalid index path for tree";

  if (destination === source || destination === destinationTree.root) return;

  setChildAtIndex(destinationParent, destinationIndexPath.at(-1)!, cloneDeep(source));
  if (!isHole(destination)) newTree(destination, displaceTo);
}

export function orphanExpr({ tree, path }: TreeIndexPath, placeAt: Point, copy: boolean) {
  const expr = exprForIndexPathInTree(tree, path);
  if (isHole(expr)) return;

  const exprParent = exprForIndexPathInTree(tree, path.slice(0, -1));

  if (copy) {
    newTree(cloneDeep(expr), placeAt);
    return;
  }

  if (path.length === 0 || !isSExpr(exprParent)) {
    // expr is already the root of a tree
    tree.location = placeAt;
    return;
  }

  setChildAtIndex(exprParent, path.at(-1)!, hole);
  newTree(expr, placeAt);
}

export function deleteExpr({ tree, path }: TreeIndexPath) {
  const expr = exprForIndexPathInTree(tree, path);
  if (isHole(expr)) return;

  const exprParent = exprForIndexPathInTree(tree, path.slice(0, -1));

  if (path.length === 0 || !isSExpr(exprParent)) {
    // expr is the root of its tree
    removeTree(tree);
  } else {
    setChildAtIndex(exprParent, path.at(-1)!, hole);
  }
}

function exprForIndexPathInTree(tree: Tree, path: number[]): Expr {
  return exprAtIndexPath({ tree, path });
}
