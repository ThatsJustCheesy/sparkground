import "./app.css";
import "tippy.js/dist/tippy.css";
import { useState } from "react";
import { newTree, trees } from "./ast/trees";
import MenuBar from "./menus/MenuBar";
import MenuBarButton from "./menus/MenuBarButton";
import MenuBarTitle from "./menus/MenuBarTitle";
import { parseToExpr } from "./ast/parse";
import { Tree } from "./ast/trees";
import Editor from "./Editor";
// import { Environment, evaluate } from "./interpreter/interpret";
import Modal from "react-bootstrap/Modal";

const defaultExpr = parseToExpr(
  "(define rev-tail (lambda (l acc) (if (null? l) acc (rev-tail (cdr l) (append (list (car l)) acc)))))"
);
const defaultTree = newTree(defaultExpr, { x: 0, y: 0 });

function App() {
  const [renderCounter, setRenderCounter] = useState(0);
  const [[mainTree], setMainTree] = useState<[Tree]>([defaultTree]);

  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <MenuBar>
        <MenuBarTitle>Sparkground</MenuBarTitle>

        {/* <MenuBarButton
          action={() => {
            const source = prompt("Paste exported Sparkground or Scheme code:");
            if (!source) return;

            defaultTree.root = parseToExpr(source);
            setMainTree([mainTree]);
          }}
        >
          Import
        </MenuBarButton>
        <MenuBarButton
          action={async () => {
            await navigator.clipboard.writeText(serializeExpr(mainTree.root));
            alert("Copied to clipboard.");
          }}
        >
          Export
        </MenuBarButton> */}
        {/* <MenuBarButton
          action={() => {
            // console.log(evaluate(mainTree.root, new Environment()));
            const source = serializeExpr(mainTree.root) + " (rev-tail '(1 2 3) '())";
            console.log(source);

            const interpreter = new BiwaScheme.Interpreter((error: any) => console.error(error));
            interpreter.evaluate(source, (result: any) => console.log(result.toString()));
          }}
        >
          Run
        </MenuBarButton> */}
        <MenuBarButton
          action={() => {
            setShowHelp(true);
          }}
        >
          Help
        </MenuBarButton>
      </MenuBar>

      <Editor
        trees={trees()}
        rerender={() => setRenderCounter(renderCounter + 1)}
        renderCounter={renderCounter}
      />

      <Modal show={showHelp} onHide={() => setShowHelp(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Sparkground Help</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Add expressions</h5>
          <p>Drag expressions from the Library to the canvas area.</p>

          <h5>Build up expressions</h5>
          <p>
            Some expressions have "holes" (<i>parameters</i>) that other expressions can fill. Drop
            expressions into holes to build expression trees.
          </p>
          <p style={{ marginTop: -10 }}>
            Some expressions accept more parameters than initially shown. These have a "pull tab" at
            the end. Drag an expression over a pull tab to reveal an additional hole.
          </p>

          <h5>Replace an expression</h5>
          <p>
            Drag an expression over a hole-filling expression to replace it. You can then use or
            discard the replaced expression.
          </p>

          <h5>Delete an expression</h5>
          <p>Drag an expression into the Library area to delete it.</p>

          <h5>Edit as text</h5>
          <p>Right-click any expression to edit it as text.</p>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default App;
