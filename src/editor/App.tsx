import "./app.css";
import "tippy.js/dist/tippy.css";
import { useState } from "react";
import { globalMeta, trees } from "./trees/trees";
import Editor from "./Editor";
import AppMenuBar from "./ui/menu-bar/AppMenuBar";
import HelpDialog from "./ui/HelpDialog";
import { TreeIndexPath } from "./trees/tree";
import LoadDialog from "./projects/LoadDialog";
import SaveDialog from "./projects/SaveDialog";
import { Simulator } from "../simulator/simulate";
import { Program } from "../simulator/program";
import AppContextMenu from "./ui/context-menu/AppContextMenu";

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

  const [program, setProgram] = useState(new Program(trees()));
  const [simulator, setSimulator] = useState(new Simulator());

  const [loadResolve, setLoadResolve] = useState<(source: string | undefined) => void>();
  const [saveResolve, setSaveResolve] = useState<() => void>();

  function onBlockContextMenu(indexPath: TreeIndexPath) {
    setBlockContextMenuSubject(indexPath);
  }

  async function runAll() {
    const program = new Program(trees());
    setProgram(program);

    simulator.setProgram(program);
    simulator.run();

    rerender();
  }

  function stopAll() {
    if (program) setProgram(new Program(trees()));

    simulator.stop();
    rerender();
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
        onRunAll={() => runAll()}
        onStopAll={() => stopAll()}
        rerender={rerender}
      />

      <Editor
        trees={trees()}
        meta={globalMeta}
        program={program}
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

      <AppContextMenu
        blockContextMenuSubject={blockContextMenuSubject}
        setCodeEditorSubject={setCodeEditorSubject}
        setProgram={setProgram}
        rerender={rerender}
      />
    </>
  );
}

export default App;
