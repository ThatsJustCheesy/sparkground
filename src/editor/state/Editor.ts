import { cloneDeep, isEqual } from "lodash";
import { Expr, Lambda, NameBinding, Var } from "../../expr/expr";
import { Parser } from "../../expr/parse";
import { Program } from "../../simulator/program";
import { Untyped } from "../../typechecker/type";
import { serializeExpr } from "../trees/serialize";
import {
  TreeIndexPath,
  extendIndexPath,
  nodeAtIndexPath,
  referencesToBindingInScope,
  rootIndexPath,
} from "../trees/tree";
import { Point, Trees } from "../trees/Trees";
import { Datum } from "../../datum/datum";
import { EditorRunner } from "./EditorRunner";

export class Editor {
  trees: Trees = new Trees();
  runner: EditorRunner;

  rerender: () => void;

  constructor(rerender: () => void) {
    this.rerender = rerender;
    this.runner = new EditorRunner(this);
  }

  static empty() {
    return new Editor(() => {});
  }

  deforest() {
    this.trees.reset();
    this.rerender();
  }

  async cut(indexPath: TreeIndexPath) {
    await this.copy(indexPath);
    this.trees.deleteExpr(indexPath);
    this.rerender();
  }

  async copy(indexPath: TreeIndexPath) {
    await navigator.clipboard.writeText(serializeExpr(nodeAtIndexPath(indexPath)));
  }

  async paste(placeAt: Point) {
    const source = await navigator.clipboard.readText();

    const exprs = Parser.parseToExprs(source);
    if (!exprs.length) return;

    exprs.forEach((expr) => {
      this.trees.addNew(expr, placeAt, this.trees.meta.currentPageID ?? 0);
    });
    this.rerender();
  }

  async pasteOver(indexPath: TreeIndexPath, orphanToOrPlaceAt: Point) {
    const source = await navigator.clipboard.readText();
    const expr = Parser.parseToExpr(source);

    if (indexPath.path.length) {
      this.trees.orphanExpr(indexPath, orphanToOrPlaceAt, true);
      this.trees.replaceExpr(indexPath, expr);
    } else {
      // Target is the root of a tree; don't replace, just add a new tree
      this.trees.addNew(expr, orphanToOrPlaceAt, this.trees.meta.currentPageID!);
    }
    this.rerender();
  }

  duplicate(indexPath: TreeIndexPath, placeAt: Point) {
    this.trees.orphanExpr(indexPath, placeAt, true);
    this.rerender();
  }

  delete(indexPath: TreeIndexPath) {
    this.trees.deleteExpr(indexPath);
    this.rerender();
  }

  nameBinding(indexPath: TreeIndexPath): void {
    const newName = prompt("Enter variable name:");
    if (!newName) return;

    this.trees.replaceExpr(indexPath, { kind: "name-binding", id: newName });
    this.rerender();
  }

  renameBinding(binding: NameBinding, scope: TreeIndexPath): void {
    const newName = prompt("Enter variable name:");
    if (!newName) return;

    const scopeNode = nodeAtIndexPath(scope);
    if (
      (scopeNode.kind === "define" || scopeNode.kind === "struct") &&
      scopeNode.name === binding
    ) {
      const oldName = binding.id;

      binding.id = newName;
      for (const tree of this.trees.list()) {
        const references: Var[] = referencesToBindingInScope(oldName, rootIndexPath(tree));
        references.forEach((ref) => {
          ref.id = newName;
        });
      }
    } else {
      const references: Var[] = referencesToBindingInScope(binding.id, scope);
      binding.id = newName;
      references.forEach((ref) => {
        ref.id = newName;
      });
    }

    this.rerender();
  }

  typeAnnotateBinding(binding: NameBinding) {
    binding.type = Untyped;
    this.rerender();
  }

  removeTypeAnnotationFromBinding(binding: NameBinding) {
    delete binding.type;
    this.rerender();
  }

  returnTypeAnnotateLambda(lambda: Lambda) {
    lambda.returnType = Untyped;
    this.rerender();
  }

  removeReturnTypeAnnotation(lambda: Lambda) {
    delete lambda.returnType;
    this.rerender();
  }

  applyAsFunction(varRef: Var, indexPath: TreeIndexPath) {
    this.trees.replaceExpr(indexPath, { kind: "call", called: varRef, args: [] });
    this.rerender();
  }

  removeFunctionFromCall(indexPath: TreeIndexPath, placeAt: Point) {
    this.trees.orphanExpr(extendIndexPath(indexPath, 0), placeAt, false);
    this.rerender();
  }

  evaluate(indexPath: TreeIndexPath, placeResultAt: Point) {
    const program = new Program(this.trees.list());
    this.runner.program = program;

    const result = cloneDeep(program.evalInProgram(indexPath));

    if (result !== undefined) {
      // FIXME: builtin function representation
      this.trees.addNew(result as Datum, placeResultAt, indexPath.tree.page);
    }

    this.rerender();
  }
}

export async function typedNodeAtIndexPath<Tag extends string>(
  indexPath: TreeIndexPath,
  tag: Tag,
): Promise<Expr & { kind: Tag }> {
  return new Promise((resolve) => {
    const node = nodeAtIndexPath(indexPath);
    if (node.kind !== tag) {
      console.error("unexpected node type at index path", indexPath, tag);
      return;
    }

    resolve(node as any);
  });
}
