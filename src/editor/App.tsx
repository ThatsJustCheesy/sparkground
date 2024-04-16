import "./app.css";
import "tippy.js/dist/tippy.css";
import { useEffect, useState } from "react";
import EditorComponent from "./Editor";
import AppMenuBar from "./ui/menu-bar/AppMenuBar";
import HelpDialog from "./ui/HelpDialog";
import { TreeIndexPath } from "./trees/tree";
import LoadDialog from "./projects/LoadDialog";
import SaveDialog from "./projects/SaveDialog";
import AppContextMenu from "./ui/context-menu/AppContextMenu";
import { Editor } from "./state/Editor";

function App() {
  const [renderCounter, setRenderCounter] = useState(0);
  function rerender() {
    setRenderCounter(renderCounter + 1);
  }

  const [editor] = useState(new Editor(rerender));
  useEffect(() => {
    editor.rerender = rerender;
  }, [renderCounter]);

  const [contextMenuSubject, setContextMenuSubject] = useState<TreeIndexPath>();
  const [codeEditorSubject, setCodeEditorSubject] = useState<TreeIndexPath>();

  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  const [loadResolve, setLoadResolve] = useState<(source: string | undefined) => void>();
  const [saveResolve, setSaveResolve] = useState<() => void>();

  function onBlockContextMenu(indexPath: TreeIndexPath) {
    setContextMenuSubject(indexPath);
  }

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
        onRunAll={() => editor.runner.runAll()}
        onStopAll={() => editor.runner.stopAll()}
        editor={editor}
      />

      <EditorComponent
        editor={editor}
        onBlockContextMenu={onBlockContextMenu}
        codeEditorSubject={codeEditorSubject}
        setCodeEditorSubject={setCodeEditorSubject}
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
        editor={editor}
      />
      <HelpDialog show={showHelpDialog} onHide={() => setShowHelpDialog(false)} />

      <AppContextMenu
        subject={contextMenuSubject!}
        setCodeEditorSubject={setCodeEditorSubject}
        editor={editor}
      />
    </>
  );
}

export default App;
