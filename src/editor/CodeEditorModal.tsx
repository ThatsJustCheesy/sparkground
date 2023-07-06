import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Editor from "@monaco-editor/react";

import { TreeIndexPath, exprAtIndexPath } from "../ast/ast";
import { serializeExpr } from "../ast/serialize";
import { useEffect, useState } from "react";

export type Props = {
  indexPath?: TreeIndexPath;

  onClose: (newSource?: string) => void;
};

export default function CodeEditorModal({ indexPath, onClose }: Props) {
  const [newSource, setNewSource] = useState<string>();

  useEffect(() => {
    setNewSource(indexPath ? serializeExpr(exprAtIndexPath(indexPath)) : undefined);
  }, [indexPath]);

  return (
    <Modal show={!!indexPath} onHide={() => onClose()} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit code</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Editor
          height="40vh"
          language="scheme"
          options={{
            minimap: { enabled: false },
            overviewRulerLanes: 0,
            bracketPairColorization: { enabled: true },
          }}
          value={newSource}
          onChange={setNewSource}
          onMount={(editor, monaco) => {
            editor.addAction({
              id: "sparkground-save-expression",
              label: "Sparkground: Save Expression",
              keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
              run: (editor) => {
                onClose(editor.getValue());
              },
            });
          }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onClose()}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onClose(newSource)}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
