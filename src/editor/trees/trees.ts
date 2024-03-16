import { Expr } from "../../expr/expr";
import { ProjectMeta } from "../../project-meta";

export type Point = {
  x: number;
  y: number;
};

export type PageID = number;
export const LibraryPageID = -1;
export const InvisiblePageID = -2;

export type Page = {
  id: PageID;
  name: string;
};

export type Tree<Root extends Expr = Expr> = {
  id: string;
  root: Root;
  location: Point;
  page: PageID;
  zIndex: number;
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

export function newTree(root: Expr, location: Point, page: PageID): Tree {
  const tree: Tree = {
    id: `${++nextID}`,
    root,
    location,
    page,
    zIndex: ++nextZIndex,
  };
  trees_.push(tree);
  return tree;
}

export function removeTree(tree: Tree) {
  trees_ = trees_.filter((tree_) => tree_.id !== tree.id);
}
export function deforest() {
  trees_ = [];
  globalMeta = { ...DefaultGlobalMeta };
}

export function bringTreeToFront(tree: Tree) {
  tree.zIndex = ++nextZIndex;
}

const DefaultGlobalMeta: ProjectMeta = { pages: [{ id: 0, name: "Main" }] };
export let globalMeta: ProjectMeta = { ...DefaultGlobalMeta };
export function setGlobalMeta(meta: ProjectMeta) {
  globalMeta = meta;
}
