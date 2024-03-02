import { DirectedGraph } from "graphology";
import { forEachConnectedComponent } from "graphology-components";
import { topologicalSort } from "graphology-dag";
import { subgraph } from "graphology-operators";
import { Define, Expr, NameBinding } from "../../expr/expr";
import { Typechecker } from "../../typechecker/typecheck";
import { referencesToBinding, rootIndexPath } from "./tree";
import { keyBy } from "lodash";

export type Point = {
  x: number;
  y: number;
};

export type Tree<Root extends Expr = Expr> = {
  id: string;
  root: Root;
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

export function globalDefines(): Tree<Define>[] {
  return trees().filter(
    (tree) => tree.root.kind === "define" && tree.root.name.kind === "name-binding"
  ) as Tree<Define>[];
}

export function globalDefinesInDependencyOrder(): [Tree<Define>[], Tree<Define>[][]] {
  const defines = keyBy(globalDefines(), ({ id }) => id);
  const definesKeys = Object.keys(defines);

  const graph = new DirectedGraph();

  for (const defineKey of definesKeys) {
    graph.addNode(defineKey);
  }

  for (const needleKey of definesKeys) {
    const needle = defines[needleKey]!;

    for (const haystackKey of definesKeys) {
      if (haystackKey === needleKey) continue;
      const haystack = defines[haystackKey]!;

      const refs = referencesToBinding(
        (needle.root.name as NameBinding).id,
        rootIndexPath(haystack)
      );
      if (refs.length) {
        // needle used-by haystack
        graph.addDirectedEdge(needleKey, haystackKey);
      }
    }
  }

  let order: Tree<Define>[] = [];
  let cyclic: Tree<Define>[][] = [];
  forEachConnectedComponent(graph, (componentNodes) => {
    const component = subgraph(graph, componentNodes);
    try {
      order.push(...topologicalSort(component).map((key) => defines[key]!));
    } catch (error) {
      if (`${error}`.match(/cyclic/)) {
        cyclic.push(componentNodes.map((key) => defines[key]!));
        return;
      }
      throw error;
    }
  });

  return [order, cyclic];
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
