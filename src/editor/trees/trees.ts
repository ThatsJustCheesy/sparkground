import { Expr } from "../../expr/expr";
import { Typechecker } from "../../typechecker/typecheck";

export type Point = {
  x: number;
  y: number;
};

export type Tree = {
  id: string;
  root: Expr;
  location: Point;
  zIndex: number;
  typechecker: Typechecker;
};

let trees_: Tree[] = [];
let nextID = 0;
let nextZIndex = 1;

export function trees(): Tree[] {
  return [...trees_];
}

export function treeByID(id: string): Tree | undefined {
  return trees_.find((tree) => tree.id === id);
}

export function newTree(root: Expr, location: Point): Tree {
  const tree: Tree = {
    id: `${++nextID}`,
    root,
    location,
    zIndex: ++nextZIndex,
    typechecker: new Typechecker(),
  };
  trees_.push(tree);
  return tree;
}

export function removeTree(tree: Tree) {
  trees_ = trees_.filter((tree_) => tree_.id !== tree.id);
}
export function deforest() {
  trees_ = [];
}

export function bringTreeToFront(tree: Tree) {
  tree.zIndex = ++nextZIndex;
}
