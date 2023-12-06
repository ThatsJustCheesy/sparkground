import "./app.css";
import "tippy.js/dist/tippy.css";
import { SyntheticEvent, useState } from "react";
import { newTree, trees } from "./ast/trees";
import Editor from "./Editor";
import AppMenuBar from "./ui/menus/AppMenuBar";
import HelpDialog from "./ui/HelpDialog";
import { Parser } from "./ast/parse";
import { ContextMenu, ContextMenuItem } from "rctx-contextmenu";
import MenuItemSeparator from "./ui/menus/MenuItemSeparator";
import { deleteExpr, orphanExpr } from "./ast/mutate";
import { TreeIndexPath, exprAtIndexPath, hole, rootIndexPath } from "./ast/ast";

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

  const [showHelp, setShowHelp] = useState(false);

  function onBlockContextMenu(indexPath: TreeIndexPath) {
    setBlockContextMenuSubject(indexPath);
  }

  function textEditBlockContextMenuSubject(event: SyntheticEvent) {
    setCodeEditorSubject(blockContextMenuSubject);
  }

  function duplicateBlockContextMenuSubject(event: SyntheticEvent) {
    const clickEvent = event.nativeEvent as MouseEvent;
    if (blockContextMenuSubject) {
      orphanExpr(blockContextMenuSubject, { x: clickEvent.clientX, y: clickEvent.clientY }, true);
      rerender();
    }
  }

  function deleteBlockContextMenuSubject() {
    if (blockContextMenuSubject) {
      deleteExpr(blockContextMenuSubject);
      rerender();
    }
  }

  return (
    <>
      <AppMenuBar onShowHelp={() => setShowHelp(true)} rerender={rerender} />

      <Editor
        trees={trees()}
        onBlockContextMenu={onBlockContextMenu}
        codeEditorSubject={codeEditorSubject}
        setCodeEditorSubject={setCodeEditorSubject}
        rerender={rerender}
        renderCounter={renderCounter}
      />

      <HelpDialog show={showHelp} onHide={() => setShowHelp(false)} />

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
