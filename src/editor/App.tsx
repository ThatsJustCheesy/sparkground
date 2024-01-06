import "./app.css";
import "tippy.js/dist/tippy.css";
import { SyntheticEvent, useState } from "react";
import { newTree, trees } from "./trees/trees";
import Editor from "./Editor";
import AppMenuBar from "./ui/menus/AppMenuBar";
import HelpDialog from "./ui/HelpDialog";
import { Parser } from "../expr/parse";
import { ContextMenu, ContextMenuItem } from "rctx-contextmenu";
import MenuItemSeparator from "./ui/menus/MenuItemSeparator";
import { deleteExpr, orphanExpr } from "./trees/mutate";
import { TreeIndexPath } from "./trees/tree";
import LoadDialog from "./projects/LoadDialog";
import SaveDialog from "./projects/SaveDialog";

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

  function textEditBlockContextMenuSubject(event: SyntheticEvent) {
    setCodeEditorSubject(blockContextMenuSubject);
  }

  function duplicateBlockContextMenuSubject(event: SyntheticEvent) {
    const clickEvent = event.nativeEvent as MouseEvent;
    if (blockContextMenuSubject) {
      const blocksArea = document.querySelector(".blocks");
      orphanExpr(
        blockContextMenuSubject,
        {
          x: clickEvent.clientX + (blocksArea?.scrollLeft ?? 0),
          y: clickEvent.clientY + (blocksArea?.scrollTop ?? 0),
        },
        true
      );
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

      <ContextMenu id={`menu`} hideOnLeave={false}>
        <ContextMenuItem onClick={textEditBlockContextMenuSubject}>Edit as Text</ContextMenuItem>
        <MenuItemSeparator />
        <ContextMenuItem onClick={duplicateBlockContextMenuSubject}>Duplicate</ContextMenuItem>
        <ContextMenuItem onClick={deleteBlockContextMenuSubject}>Delete</ContextMenuItem>
      </ContextMenu>
    </>
  );
}

export default App;
