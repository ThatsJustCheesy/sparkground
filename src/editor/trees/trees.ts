import { cloneDeep } from "lodash";
import { Expr } from "../../expr/expr";
import {
  TreeIndexPath,
  hole,
  isAtomic,
  isHoleForEditor,
  isSameOrAncestor,
  nodeAtIndexPath,
  setChildAtIndex,
} from "./tree";
import { TypeVar, isTypeNameBinding } from "../../typechecker/type";
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

const DefaultMeta = { pages: [{ id: 0, name: "Main" }] };

export class Trees {
  #trees: Tree[] = [];
  #nextID = 1;
  #nextZIndex = 1;

  meta: ProjectMeta = { ...DefaultMeta };

  list(): Tree[] {
    return [...this.#trees];
  }

  byID(id: string): Tree | undefined {
    return this.#trees.find((tree) => tree.id === id);
  }

  addNew(root: Expr, location: Point, page: PageID): Tree {
    const tree: Tree = {
      id: `${this.#nextID++}`,
      root,
      location: { ...location },
      page,
      zIndex: this.#nextZIndex++,
    };
    this.#trees.push(tree);
    return tree;
  }

  remove(tree: Tree) {
    this.#trees = this.#trees.filter((tree_) => tree_.id !== tree.id);
  }

  reset() {
    this.#trees = [];
    this.meta = { ...DefaultMeta };
  }

  bringToFront(tree: Tree) {
    tree.zIndex = this.#nextZIndex++;
  }

  #destinationPageID(proposedID: PageID): PageID {
    return proposedID >= 0 ? proposedID : this.meta.currentPageID ?? 0;
  }

  moveExprInTree(
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
      this.remove(sourceTree);
    } else {
      const sourceParent = nodeForIndexPathInTree(sourceTree, sourceIndexPath.slice(0, -1));

      setChildAtIndex(sourceParent, sourceIndexPath.at(-1)!, hole);
    }

    setChildAtIndex(destinationParent, destinationIndexPath.at(-1)!, source);
    if (!isHoleForEditor(destination)) {
      this.addNew(destination, displaceTo, this.#destinationPageID(destinationTree.page));
    }
  }

  copyExprInTree(
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
      this.addNew(destination, displaceTo, this.#destinationPageID(destinationTree.page));
    }
  }

  orphanExpr({ tree, path }: TreeIndexPath, placeAt: Point, copy: boolean): Tree {
    const expr = nodeForIndexPathInTree(tree, path);
    if (isHoleForEditor(expr)) return tree;

    const parent = nodeForIndexPathInTree(tree, path.slice(0, -1));

    if (copy) {
      return this.addNew(cloneExpr(expr), placeAt, this.#destinationPageID(tree.page));
    }

    if (path.length === 0 || isAtomic(parent)) {
      // expr is already the root of a tree
      tree.location = placeAt;
      return tree;
    }

    setChildAtIndex(parent, path.at(-1)!, hole);
    return this.addNew(expr, placeAt, this.#destinationPageID(tree.page));
  }

  deleteExpr({ tree, path }: TreeIndexPath) {
    const expr = nodeForIndexPathInTree(tree, path);
    if (isHoleForEditor(expr)) return;

    const exprParent = nodeForIndexPathInTree(tree, path.slice(0, -1));

    if (path.length === 0 || isAtomic(exprParent)) {
      // expr is the root of its tree
      this.remove(tree);
    } else {
      setChildAtIndex(exprParent, path.at(-1)!, hole);
    }
  }

  replaceExpr(indexPath: TreeIndexPath, newNode: Expr) {
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
