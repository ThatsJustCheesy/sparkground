import Modal from "react-bootstrap/Modal";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";

export type Props = {
  show: boolean;
  onHide: () => void;
};

export default function HelpDialog({ show, onHide }: Props) {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Sparkground Help</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs>
          <Tab eventKey="1" title="Editing">
            <div className="my-3" />

            <h5>Add blocks</h5>
            <p>Drag blocks from the Library to the canvas area.</p>

            <h5>Build up expressions</h5>
            <p>
              Some blocks have "holes" (<i>parameters</i>) that other blocks can fill. Drop blocks
              into holes to build expression trees.
            </p>
            <p style={{ marginTop: -10 }}>
              Some blocks accept more parameters than initially shown. These have a "pull tab" at
              the end. Drag a block over a pull tab to reveal an additional hole.
            </p>

            <h5>Duplicate blocks</h5>
            <p>
              To copy a block, hold the <i>Alt</i> key and drag it, or right-click and choose{" "}
              <i>Duplicate</i>.
            </p>

            <h5>Delete blocks</h5>
            <p>
              To delete a block, drop it on the Library area, or right-click and choose{" "}
              <i>Delete</i>.
            </p>

            <h5>More editing actions</h5>
            <p>Right-click any block to see contextual editing actions.</p>
          </Tab>
          <Tab eventKey="2" title="Projects">
            <div className="my-3" />

            <h5>Save a project</h5>
            <p>
              Choose <i>Save</i> at the top. Then choose <i>Save New</i> and enter a project name,
              or choose an existing project to overwrite.
            </p>

            <h5>Load a project</h5>
            <p>
              Choose <i>Load</i> at the top, then choose a project to load. You can also rename,
              delete, import, and export projects from here.
            </p>
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );
}
