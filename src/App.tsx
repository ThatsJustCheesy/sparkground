import "./app.css";
import { useState } from "react";
import { ProgSymbol } from "./symbol-table";
import { s } from "./ast/ast";
import { newTree, trees } from "./ast/trees";
import MenuBar from "./menus/MenuBar";
import MenuBarButton from "./menus/MenuBarButton";
import MenuBarTitle from "./menus/MenuBarTitle";
import { serializeExpr } from "./ast/serialize";
import { parseToExpr } from "./ast/parse";
import { Tree } from "./ast/trees";
import Editor from "./editor/Editor";
import { symbols } from "./library/library-defs";
// import { Environment, evaluate } from "./interpreter/interpret";
import BiwaScheme from "biwascheme";

const revTail: ProgSymbol = {
  id: "rev-tail",

  minArgCount: 2,
  bodyArgHints: ["l", "acc"],
};
const l: ProgSymbol = {
  id: "l",
};
const acc: ProgSymbol = {
  id: "acc",
};

const defaultExpr = s(
  symbols.define,
  s(revTail, l, acc),
  s(
    symbols.if,
    s(symbols["null?"], l),
    acc,
    s(revTail, s(symbols.cdr, l), s(symbols.append, s(symbols.list, s(symbols.car, l)), acc))
  )
);
const defaultTree = newTree(defaultExpr, { x: 0, y: 0 });

function App() {
  const [renderCounter, setRenderCounter] = useState(0);
  const [[mainTree], setMainTree] = useState<[Tree]>([defaultTree]);

  return (
    <>
      <MenuBar>
        <MenuBarTitle>Sparkground</MenuBarTitle>

        <MenuBarButton
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
        </MenuBarButton>
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
      </MenuBar>

      <Editor
        trees={trees()}
        rerender={() => setRenderCounter(renderCounter + 1)}
        renderCounter={renderCounter}
      />
    </>
  );
}

export default App;
