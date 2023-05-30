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

const revTail: ProgSymbol = {
  id: "rev-tail",

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
      </MenuBar>

      <Editor trees={trees()} rerender={() => setRenderCounter(renderCounter + 1)} />
    </>
  );
}

export default App;
