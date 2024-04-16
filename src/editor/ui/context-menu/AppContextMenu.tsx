import { cloneDeep } from "lodash";
import { ContextMenu, ContextMenuItem } from "rctx-contextmenu";
import { SyntheticEvent } from "react";
import { Datum } from "../../../datum/datum";
import { Var } from "../../../expr/expr";
import { Parser } from "../../../expr/parse";
import { Program } from "../../../simulator/program";
import { Untyped } from "../../../typechecker/type";
import { deleteExpr, moveExprInTree, orphanExpr, replaceExpr } from "../../trees/mutate";
import { serializeExpr } from "../../trees/serialize";
import {
  TreeIndexPath,
  extendIndexPath,
  nodeAtIndexPath,
  parentIndexPath,
  referencesToBinding,
} from "../../trees/tree";
import { Point, globalMeta, newTree, trees } from "../../trees/trees";
import ContextMenuItemSeparator from "./ContextMenuItemSeparator";
import { PropSetter } from "../../../util";

export type Props = {
  blockContextMenuSubject: TreeIndexPath | undefined;
  setCodeEditorSubject: PropSetter<TreeIndexPath>;

  setProgram: PropSetter<Program>;

  rerender: () => void;
};

export default function AppContextMenu({
  blockContextMenuSubject,
  setCodeEditorSubject,

  setProgram,

  rerender,
}: Props) {
  function mouseCursorLocation(event: SyntheticEvent): Point {
    const clickEvent = event.nativeEvent as MouseEvent;
    const blocksArea = document.querySelector(".blocks-page");

    const shiftX = blocksArea ? blocksArea.scrollLeft : 0;
    const shiftY = blocksArea
      ? blocksArea.scrollTop - blocksArea.getBoundingClientRect().top + 48
      : 0;

    return {
      x: clickEvent.clientX + shiftX,
      y: clickEvent.clientY + shiftY,
    };
  }

  async function pasteInEditor(event: SyntheticEvent) {
    const source = await navigator.clipboard.readText();

    const exprs = Parser.parseToExprs(source);
    if (!exprs.length) return;

    exprs.forEach((expr) => {
      newTree(expr, { ...mouseCursorLocation(event) }, globalMeta.currentPageID ?? 0);
    });
    rerender();
  }

  function renameContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const binding = nodeAtIndexPath(blockContextMenuSubject);
    if (binding.kind !== "name-binding") return;

    const references: Var[] = referencesToBinding(
      binding.id,
      parentIndexPath(blockContextMenuSubject)
    );

    const newName = prompt("Enter variable name:");
    if (!newName) return;

    binding.id = newName;
    references.forEach((ref) => {
      ref.id = newName;
    });
    rerender();
  }

  function nameContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const newName = prompt("Enter variable name:");
    if (!newName) return;

    const location = mouseCursorLocation(event);
    const newBinding = newTree(
      {
        kind: "name-binding",
        id: newName,
      },
      location,
      blockContextMenuSubject.tree.page
    );
    moveExprInTree({ tree: newBinding, path: [] }, blockContextMenuSubject, location);
    rerender();
  }

  function typeAnnotateContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const nameBinding = nodeAtIndexPath(blockContextMenuSubject);
    if (nameBinding.kind !== "name-binding") return;

    nameBinding.type = Untyped;
    rerender();
  }

  function typeUnannotateContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const nameBinding = nodeAtIndexPath(blockContextMenuSubject);
    if (nameBinding.kind !== "name-binding") return;

    delete nameBinding.type;
    rerender();
  }

  function applyContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const variable = nodeAtIndexPath(blockContextMenuSubject);
    if (variable.kind !== "var") return;

    replaceExpr(blockContextMenuSubject, { kind: "call", called: variable, args: [] });
    rerender();
  }

  function unapplyContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const call = nodeAtIndexPath(blockContextMenuSubject);
    if (call.kind !== "call") return;

    const location = mouseCursorLocation(event);
    orphanExpr(extendIndexPath(blockContextMenuSubject, 0), location, false);
    rerender();
  }

  function textEditBlockContextMenuSubject(event: SyntheticEvent) {
    setCodeEditorSubject(blockContextMenuSubject);
  }

  async function cutBlockContextMenuSubject(event: SyntheticEvent) {
    if (blockContextMenuSubject) {
      await navigator.clipboard.writeText(serializeExpr(blockContextMenuSubject.tree.root));
      deleteExpr(blockContextMenuSubject);
      rerender();
    }
  }

  async function copyBlockContextMenuSubject(event: SyntheticEvent) {
    if (blockContextMenuSubject) {
      await navigator.clipboard.writeText(serializeExpr(blockContextMenuSubject.tree.root));
    }
  }

  async function pasteOverBlockContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const source = await navigator.clipboard.readText();
    const expr = Parser.parseToExpr(source);

    const location = mouseCursorLocation(event);
    if (blockContextMenuSubject.path.length) {
      orphanExpr(blockContextMenuSubject, location, true);
      replaceExpr(blockContextMenuSubject, expr);
    } else {
      // Target is the root of a tree; don't replace, just add a new tree
      newTree(expr, location, globalMeta.currentPageID!);
    }
    rerender();
  }

  function duplicateBlockContextMenuSubject(event: SyntheticEvent) {
    if (blockContextMenuSubject) {
      const location = mouseCursorLocation(event);
      orphanExpr(blockContextMenuSubject, location, true);
      rerender();
    }
  }

  function deleteBlockContextMenuSubject() {
    if (blockContextMenuSubject) {
      deleteExpr(blockContextMenuSubject);
      rerender();
    }
  }

  function evaluateContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const program = new Program(trees());
    setProgram(program);

    const result = cloneDeep(program.evalInProgram(blockContextMenuSubject));

    if (result !== undefined) {
      const location = mouseCursorLocation(event);
      // FIXME: builtin function representation
      newTree(result as Datum, location, blockContextMenuSubject.tree.page);
    }

    rerender();
  }

  const commonContextMenu = (
    <>
      <ContextMenuItem onClick={textEditBlockContextMenuSubject}>Edit as Text</ContextMenuItem>
      <ContextMenuItemSeparator />
      <ContextMenuItem onClick={cutBlockContextMenuSubject}>Cut</ContextMenuItem>
      <ContextMenuItem onClick={copyBlockContextMenuSubject}>Copy</ContextMenuItem>
      <ContextMenuItem onClick={pasteOverBlockContextMenuSubject}>Paste</ContextMenuItem>
      <ContextMenuItemSeparator />
      <ContextMenuItem onClick={duplicateBlockContextMenuSubject}>Duplicate</ContextMenuItem>
      <ContextMenuItem onClick={deleteBlockContextMenuSubject}>Delete</ContextMenuItem>
    </>
  );

  const evaluateContextMenu = (
    <>
      <ContextMenuItemSeparator />
      <ContextMenuItem onClick={evaluateContextMenuSubject}>Evaluate</ContextMenuItem>
    </>
  );

  return (
    <>
      <ContextMenu id="editor-background-menu" hideOnLeave={false}>
        <ContextMenuItem onClick={pasteInEditor}>Paste</ContextMenuItem>
      </ContextMenu>

      <ContextMenu id="block-menu" hideOnLeave={false}>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-evaluable" hideOnLeave={false}>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-namebinding" hideOnLeave={false}>
        <ContextMenuItem onClick={typeAnnotateContextMenuSubject}>
          Annotate Variable Type
        </ContextMenuItem>
        <ContextMenuItem onClick={renameContextMenuSubject}>Rename Variable</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-namebinding-annotated" hideOnLeave={false}>
        <ContextMenuItem onClick={typeUnannotateContextMenuSubject}>
          Remove Type Annotation
        </ContextMenuItem>
        <ContextMenuItem onClick={renameContextMenuSubject}>Rename Variable</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-typenamebinding" hideOnLeave={false}>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-namehole" hideOnLeave={false}>
        <ContextMenuItem onClick={nameContextMenuSubject}>Name Variable</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-typenamehole" hideOnLeave={false}>
        <ContextMenuItem onClick={nameContextMenuSubject}>Name Type Variable</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-var" hideOnLeave={false}>
        <ContextMenuItem onClick={applyContextMenuSubject}>Apply</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-var-evaluable" hideOnLeave={false}>
        <ContextMenuItem onClick={applyContextMenuSubject}>Apply</ContextMenuItem>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-call" hideOnLeave={false}>
        <ContextMenuItem onClick={unapplyContextMenuSubject}>Unapply</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-call-evaluable" hideOnLeave={false}>
        <ContextMenuItem onClick={unapplyContextMenuSubject}>Unapply</ContextMenuItem>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-apply" hideOnLeave={false}>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-apply-evaluable" hideOnLeave={false}>
        {commonContextMenu}
        {evaluateContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-pull-tab" hideOnLeave={false}>
        <ContextMenuItem onClick={textEditBlockContextMenuSubject}>Edit as Text</ContextMenuItem>
        <ContextMenuItemSeparator />
        <ContextMenuItem onClick={pasteOverBlockContextMenuSubject}>Paste</ContextMenuItem>
      </ContextMenu>
    </>
  );
}
