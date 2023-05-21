import { Expr, isHole } from "./ast";

export type Tree = {
  id: string;
  root: Expr;
};

let trees_: Tree[] = [];
let nextID = 0;

export function trees(): Tree[] {
  return [...trees_];
}

export function newTree(root: Expr) {
  if (isHole(root)) return;

  trees_.push({
    id: `${++nextID}`,
    root,
  });
}

export function removeTree(tree: Tree) {
  trees_ = trees_.filter((tree_) => tree_.id !== tree.id);
}
