import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import { useEffect, useRef, useState } from "react";
import { TreeIndexPath, nodeAtIndexPath } from "./trees/tree";
import { Expr } from "../expr/expr";

export type Props = {
  indexPath?: TreeIndexPath;

  onClose: (newNode?: Expr) => void;
};

export default function ValueEditorModal({ indexPath, onClose }: Props) {
  const [newValueRepr, setNewValueRepr] = useState<string>();
  const [newNode, setNewNode] = useState<Expr>();

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (indexPath) {
      const node = nodeAtIndexPath(indexPath);
      setNewNode(node);
      switch (node.kind) {
        case "Number":
          setNewValueRepr(`${node.value}`);
          break;
        case "String":
          setNewValueRepr(node.value);
          break;
      }
    } else {
      setNewNode(undefined);
      setNewValueRepr(undefined);
    }
  }, [indexPath]);

  useEffect(() => {
    if (indexPath) {
      setTimeout(() => {
        formRef.current?.querySelector("input")?.select();
      });
    }
  }, [indexPath]);

  return (
    <Modal show={!!indexPath} onHide={() => onClose()} centered backdropClassName="modal-backdrop">
      <Modal.Header closeButton>
        <Modal.Title>Edit Value</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();

            onClose(newNode);
          }}
        >
          {newNode?.kind === "Number" ? (
            <input
              className="form-control"
              type="number"
              step="any"
              value={newValueRepr}
              onChange={(event) => {
                setNewValueRepr(event.target.value);
                if (event.target.value.length) {
                  setNewNode({ kind: "Number", value: Number(event.target.value) });
                }
              }}
            />
          ) : newNode?.kind === "String" ? (
            <input
              className="form-control"
              type="text"
              value={newValueRepr}
              onChange={(event) => {
                setNewValueRepr(event.target.value);
                setNewNode({ kind: "String", value: event.target.value });
              }}
            />
          ) : (
            ""
          )}
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onClose()}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onClose(newNode)}>
          Update
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
