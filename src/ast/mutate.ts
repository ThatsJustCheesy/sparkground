import { cloneDeep } from "lodash";
import { Expr, TreeIndexPath, childAtIndex, hole, isSExpr, setChildAtIndex } from "./ast";
import { Tree, newTree, removeTree } from "./trees";

export function moveExprInTree(
  { tree: sourceTree, path: sourceIndexPath }: TreeIndexPath,
  { tree: destinationTree, path: destinationIndexPath }: TreeIndexPath
) {
  const source = exprForIndexPathInTree(sourceTree, sourceIndexPath);
  if (source === sourceTree.root) {
    removeTree(sourceTree);
  } else {
    const sourceParent = exprForIndexPathInTree(sourceTree, sourceIndexPath.slice(0, -1));
    if (!isSExpr(sourceParent)) throw "invalid index path for tree";

    setChildAtIndex(sourceParent, sourceIndexPath.at(-1)!, hole);
  }

  const destination = exprForIndexPathInTree(destinationTree, destinationIndexPath);
  const destinationParent = exprForIndexPathInTree(
    destinationTree,
    destinationIndexPath.slice(0, -1)
  );
  if (!isSExpr(destinationParent)) throw "invalid index path for tree";

  if (destination === source || destination === destinationTree.root) return;

  setChildAtIndex(destinationParent, destinationIndexPath.at(-1)!, source);
  newTree(destination);
}

export function copyExprInTree(
  { tree: sourceTree, path: sourceIndexPath }: TreeIndexPath,
  { tree: destinationTree, path: destinationIndexPath }: TreeIndexPath
) {
  const source = exprForIndexPathInTree(sourceTree, sourceIndexPath);
  if (source === sourceTree.root) {
    removeTree(sourceTree);
  } else {
    const sourceParent = exprForIndexPathInTree(sourceTree, sourceIndexPath.slice(0, -1));
    if (!isSExpr(sourceParent)) throw "invalid index path for tree";

    setChildAtIndex(sourceParent, sourceIndexPath.at(-1)!, hole);
  }

  const destination = exprForIndexPathInTree(destinationTree, destinationIndexPath);
  const destinationParent = exprForIndexPathInTree(
    destinationTree,
    destinationIndexPath.slice(0, -1)
  );
  if (!isSExpr(destinationParent)) throw "invalid index path for tree";

  if (destination === source || destination === destinationTree.root) return;

  setChildAtIndex(destinationParent, destinationIndexPath.at(-1)!, cloneDeep(source));
  newTree(destination);
}

export function orphanExpr({ tree, path }: TreeIndexPath) {
  const expr = exprForIndexPathInTree(tree, path);
  const exprParent = exprForIndexPathInTree(tree, path.slice(0, -1));
  if (!isSExpr(exprParent)) throw "invalid index path for tree";

  setChildAtIndex(exprParent, path.at(-1)!, hole);
  newTree(expr);
}

function exprForIndexPathInTree({ root }: Tree, indexPath: number[]): Expr {
  indexPath = [...indexPath];
  while (indexPath.length) {
    if (!isSExpr(root)) throw "invalid index path for tree";

    const index = indexPath.shift()!;
    root = childAtIndex(root, index);
  }

  return root;
}
