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

const define: ProgSymbol = {
  id: "define",
  doc: "Variable or function definition",

  headingArgCount: 1,

  special: "define",
};
const if_: ProgSymbol = {
  id: "if",
  doc: "Conditional",

  headingArgCount: 1,
  bodyArgHints: ["then", "else"],
};
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
const null_: ProgSymbol = {
  id: "null?",
  doc: "Whether the argument is an empty list",
};
const append: ProgSymbol = {
  id: "append",
};
const list: ProgSymbol = {
  id: "list",
};
const car: ProgSymbol = {
  id: "car",
  doc: "Head (first element) of the given list",
};
const cdr: ProgSymbol = {
  id: "cdr",
  doc: "Tail (all except first element) of the given list",
};

const defaultExpr = s(
  define,
  s(revTail, l, acc),
  s(if_, s(null_, true), acc, s(revTail, s(cdr, l), s(append, s(list, s(car, l)), acc)))
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
