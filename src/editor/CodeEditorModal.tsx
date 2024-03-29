import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Editor from "@monaco-editor/react";

import { TreeIndexPath, nodeAtIndexPath } from "./trees/tree";
import { serializeExpr } from "./trees/serialize";
import { useEffect, useState } from "react";

export type Props = {
  indexPath?: TreeIndexPath;

  onClose: (newSource?: string) => void;
};

export default function CodeEditorModal({ indexPath, onClose }: Props) {
  const [newSource, setNewSource] = useState<string>();

  useEffect(() => {
    setNewSource(indexPath ? serializeExpr(nodeAtIndexPath(indexPath)) : undefined);
  }, [indexPath]);

  return (
    <Modal show={!!indexPath} onHide={() => onClose()} centered backdropClassName="modal-backdrop">
      <Modal.Header closeButton>
        <Modal.Title>Edit as Text</Modal.Title>
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
          Update
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
