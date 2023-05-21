import { useState } from "react";
import "./styles/editor.css";
import { ProgSymbol } from "./symbols";
import { renderExpr } from "./ast/render";
import { Expr, TreeIndexPath, s } from "./ast/ast";
import {
  Active,
  Collision,
  CollisionDescriptor,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  Over,
  closestCorners,
  defaultCoordinates,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import { moveExprInTree, copyExprInTree, orphanExpr } from "./ast/mutate";
import Library from "./library/Library";
import { isEqual } from "lodash";
import { newTree, trees } from "./ast/trees";
import MenuBar from "./menus/MenuBar";
import MenuBarButton from "./menus/MenuBarButton";
import MenuBarTitle from "./menus/MenuBarTitle";
import { serializeExpr } from "./ast/serialize";

export function sortCollisionsClosestToZero(
  { data: { value: a } }: CollisionDescriptor,
  { data: { value: b } }: CollisionDescriptor
) {
  return Math.abs(a) - Math.abs(b);
}

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

// TODO: Hack
const emptyIdentifier: ProgSymbol = {
  id: "…",
  headingArgCount: 1,
};

const library: Expr = s(
  emptyIdentifier,
  s(define, s(emptyIdentifier, undefined)),
  s(if_, undefined, undefined, undefined)
);

const collisionDetection: CollisionDetection = ({
  collisionRect,
  droppableRects,
  droppableContainers,
}) => {
  const collisions = [];

  for (const droppableContainer of droppableContainers) {
    const { id } = droppableContainer;
    const rect = droppableRects.get(id);

    if (
      !(
        rect &&
        Math.abs(rect.top - collisionRect.top) <= Math.min(rect.height, collisionRect.height) &&
        rect.right >= collisionRect.left
      )
    )
      continue;

    const intersectionStrength = collisionRect.left - rect.left;
    if (intersectionStrength > 0) {
      collisions.push({
        id,
        data: { droppableContainer, value: intersectionStrength },
      });
    }
  }

  return collisions.sort(sortCollisionsClosestToZero);
};

const defaultExpr = s(
  define,
  s(revTail, l, acc),
  s(if_, s(null_, l), acc, s(revTail, s(cdr, l), s(append, s(list, s(car, l)), acc)))
);
newTree(defaultExpr);

function App() {
  const [[expr], setExpr] = useState<[Expr]>([defaultExpr]);
  const [contextHelpSymbol, setContextHelpSymbol] = useState<ProgSymbol>();

  return (
    <>
      <MenuBar>
        <MenuBarTitle>Sparkground</MenuBarTitle>

        <MenuBarButton
          action={() => {
            const code = prompt(
              "(Not yet implemented!) Paste exported Sparkground or Scheme code:"
            );
            // TODO: Parse and replace editor contents
          }}
        >
          Import
        </MenuBarButton>
        <MenuBarButton
          action={async () => {
            await navigator.clipboard.writeText(serializeExpr(expr));
            alert("Copied to clipboard.");
          }}
        >
          Export
        </MenuBarButton>
      </MenuBar>

      <div className="editor">
        <DndContext collisionDetection={collisionDetection} onDragEnd={onBlockDragEnd}>
          <div className="blocks">{trees().map((tree) => renderExpr(tree, tree.root))}</div>

          <Library />
        </DndContext>

        {contextHelpSymbol ? (
          <>
            {contextHelpSymbol.id}: {contextHelpSymbol.doc}
          </>
        ) : (
          <div style={{ visibility: "hidden" }}>&nbsp;</div>
        )}
      </div>
    </>
  );

  function onSymbolMouseEnter(symbol: ProgSymbol) {
    setContextHelpSymbol(symbol);
  }

  function onSymbolMouseLeave(symbol: ProgSymbol) {
    if (symbol === contextHelpSymbol) setContextHelpSymbol(undefined);
  }

  function indexPathFromDragged(item: Active | Over | null): TreeIndexPath | undefined {
    return item?.data?.current?.indexPath;
  }

  function onBlockDragEnd({ active, over }: DragEndEvent) {
    const activeIndexPath = indexPathFromDragged(active);
    if (!activeIndexPath) return;

    const overIndexPath = indexPathFromDragged(over);
    if (!overIndexPath) {
      orphanExpr(activeIndexPath);
      return;
    }

    if (active.data.current?.copyOnDrop) {
      copyExprInTree(activeIndexPath, overIndexPath);
    } else {
      moveExprInTree(activeIndexPath, overIndexPath);
    }
    setExpr([expr]);
  }
}

export default App;
