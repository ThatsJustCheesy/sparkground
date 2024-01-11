import { cloneDeep } from "lodash";
import {
  TreeIndexPath,
  nodeAtIndexPath as nodeAtIndexPath,
  hole,
  isHole,
  isSameOrAncestor,
  setChildAtIndex,
  isAtomic,
} from "./tree";
import { Point, Tree, newTree, removeTree } from "./trees";
import { Expr } from "../../expr/expr";

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

  const source = nodeForIndexPathInTree(sourceTree, sourceIndexPath);

  const destination = nodeForIndexPathInTree(destinationTree, destinationIndexPath);
  const destinationParent = nodeForIndexPathInTree(
    destinationTree,
    destinationIndexPath.slice(0, -1)
  );

  if (destination === source || destination === destinationTree.root) return;

  setChildAtIndex(destinationParent, destinationIndexPath.at(-1)!, cloneDeep(source));
  if (!isHole(destination)) newTree(destination, displaceTo);
}

export function orphanExpr({ tree, path }: TreeIndexPath, placeAt: Point, copy: boolean): Tree {
  const expr = nodeForIndexPathInTree(tree, path);
  if (isHole(expr)) return tree;

  const parent = nodeForIndexPathInTree(tree, path.slice(0, -1));

  if (copy) {
    return newTree(cloneDeep(expr), placeAt);
  }

  if (path.length === 0 || isAtomic(parent)) {
    // expr is already the root of a tree
    tree.location = placeAt;
    return tree;
  }

  setChildAtIndex(parent, path.at(-1)!, hole);
  return newTree(expr, placeAt);
}

export function deleteExpr({ tree, path }: TreeIndexPath) {
  const expr = nodeForIndexPathInTree(tree, path);
  if (isHole(expr)) return;

  const exprParent = nodeForIndexPathInTree(tree, path.slice(0, -1));

  if (path.length === 0 || isAtomic(exprParent)) {
    // expr is the root of its tree
    removeTree(tree);
  } else {
    setChildAtIndex(exprParent, path.at(-1)!, hole);
  }
}

function nodeForIndexPathInTree(tree: Tree, path: number[]): Expr {
  return nodeAtIndexPath({ tree, path });
}
