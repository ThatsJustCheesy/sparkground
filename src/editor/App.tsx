import "./app.css";
import "tippy.js/dist/tippy.css";
import { SyntheticEvent, useState } from "react";
import { Point, newTree, trees } from "./trees/trees";
import Editor from "./Editor";
import AppMenuBar from "./ui/menus/AppMenuBar";
import HelpDialog from "./ui/HelpDialog";
import { Parser } from "../expr/parse";
import { ContextMenu, ContextMenuItem } from "rctx-contextmenu";
import MenuItemSeparator from "./ui/menus/MenuItemSeparator";
import { deleteExpr, moveExprInTree, orphanExpr } from "./trees/mutate";
import {
  TreeIndexPath,
  extendIndexPath,
  hole,
  nodeAtIndexPath,
  parentIndexPath,
  referencesToBinding,
} from "./trees/tree";
import LoadDialog from "./projects/LoadDialog";
import SaveDialog from "./projects/SaveDialog";
import { Var } from "../expr/expr";

const defaultExpr = Parser.parseToExpr(
  "(define firsts (lambda (a b) (append (list (car a)) (list (car b)))))"
  // "(define rev-tail (lambda (l acc) (if (null? l) acc (rev-tail (cdr l) (append (list (car l)) acc)))))"
);
newTree(defaultExpr, { x: 0, y: 0 });

function App() {
  const [renderCounter, setRenderCounter] = useState(0);
  function rerender() {
    setRenderCounter(renderCounter + 1);
  }

  const [blockContextMenuSubject, setBlockContextMenuSubject] = useState<TreeIndexPath>();
  const [codeEditorSubject, setCodeEditorSubject] = useState<TreeIndexPath>();

  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  function onBlockContextMenu(indexPath: TreeIndexPath) {
    setBlockContextMenuSubject(indexPath);
  }

  function mouseCursorLocation(event: SyntheticEvent): Point {
    const clickEvent = event.nativeEvent as MouseEvent;
    const blocksArea = document.querySelector(".blocks");
    return {
      x: clickEvent.clientX + (blocksArea?.scrollLeft ?? 0),
      y: clickEvent.clientY + (blocksArea?.scrollTop ?? 0),
    };
  }

  function renameContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const binding = nodeAtIndexPath(blockContextMenuSubject);
    if (binding.kind !== "name-binding") return;

    const references: Var[] = referencesToBinding(
      binding.id,
      parentIndexPath(blockContextMenuSubject)
    );

    const newName = prompt("New name:");
    if (!newName) return;

    binding.id = newName;
    references.forEach((ref) => {
      ref.id = newName;
    });
  }

  function applyContextMenuSubject(event: SyntheticEvent) {
    if (!blockContextMenuSubject) return;

    const variable = nodeAtIndexPath(blockContextMenuSubject);
    if (variable.kind !== "var") return;

    const location = mouseCursorLocation(event);
    const call = newTree({ kind: "call", called: hole, args: [] }, location);
    moveExprInTree(blockContextMenuSubject, { tree: call, path: [0] }, location);
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

  const [loadResolve, setLoadResolve] = useState<(source: string | undefined) => void>();
  const [saveResolve, setSaveResolve] = useState<() => void>();

  const commonContextMenu = (
    <>
      <ContextMenuItem onClick={textEditBlockContextMenuSubject}>Edit as Text</ContextMenuItem>
      <MenuItemSeparator />
      <ContextMenuItem onClick={duplicateBlockContextMenuSubject}>Duplicate</ContextMenuItem>
      <ContextMenuItem onClick={deleteBlockContextMenuSubject}>Delete</ContextMenuItem>
    </>
  );

  return (
    <>
      <AppMenuBar
        onShowLoad={() =>
          new Promise((resolve) => {
            setShowLoadDialog(true);
            setLoadResolve(() => resolve);
          })
        }
        onShowSave={() =>
          new Promise((resolve) => {
            setShowSaveDialog(true);
            setSaveResolve(() => resolve);
          })
        }
        onShowHelp={() => setShowHelpDialog(true)}
        rerender={rerender}
      />

      <Editor
        trees={trees()}
        onBlockContextMenu={onBlockContextMenu}
        codeEditorSubject={codeEditorSubject}
        setCodeEditorSubject={setCodeEditorSubject}
        rerender={rerender}
        renderCounter={renderCounter}
      />

      <LoadDialog
        show={showLoadDialog}
        onHide={(source) => {
          setShowLoadDialog(false);
          loadResolve?.(source);
        }}
      />
      <SaveDialog
        show={showSaveDialog}
        onHide={() => {
          setShowSaveDialog(false);
          saveResolve?.();
        }}
      />
      <HelpDialog show={showHelpDialog} onHide={() => setShowHelpDialog(false)} />

      <ContextMenu id="block-menu" hideOnLeave={false}>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-namebinding" hideOnLeave={false}>
        <ContextMenuItem onClick={renameContextMenuSubject}>Rename</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-var" hideOnLeave={false}>
        <ContextMenuItem onClick={applyContextMenuSubject}>Apply</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-call" hideOnLeave={false}>
        <ContextMenuItem onClick={unapplyContextMenuSubject}>Unapply</ContextMenuItem>
        {commonContextMenu}
      </ContextMenu>

      <ContextMenu id="block-menu-apply" hideOnLeave={false}>
        {commonContextMenu}
      </ContextMenu>
    </>
  );
}

export default App;
