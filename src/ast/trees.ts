import { Expr, Hole, hole, isHole } from "./ast";

export type Tree = {
  id: string;
  root: Expr;
};

let trees_: Tree[] = [];
let nextID = 0;

export function trees(): Tree[] {
  return [...trees_];
}

export function treeByID(id: string): Tree | undefined {
  return trees_.find((tree) => tree.id === id);
}

export function newTree(root: Expr): Tree {
  const tree: Tree = {
    id: `${++nextID}`,
    root,
  };
  trees_.push(tree);
  return tree;
}

export function removeTree(tree: Tree) {
  trees_ = trees_.filter((tree_) => tree_.id !== tree.id);
}
