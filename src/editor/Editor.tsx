import "./editor.css";
import { useState } from "react";
import { ProgSymbol } from "../symbol-table";
import { renderExpr } from "../ast/render";
import { TreeIndexPath } from "../ast/ast";
import {
  Active,
  CollisionDescriptor,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  Over,
} from "@dnd-kit/core";
import { moveExprInTree, copyExprInTree, orphanExpr } from "../ast/mutate";
import Library from "../library/Library";
import { Tree } from "../ast/trees";

export type Props = {
  trees: Tree[];

  rerender(): void;
};

function sortCollisionsClosestToZero(
  { data: { value: a } }: CollisionDescriptor,
  { data: { value: b } }: CollisionDescriptor
) {
  return Math.abs(a) - Math.abs(b);
}

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

export default function Editor({ trees, rerender }: Props) {
  const [contextHelpSymbol, setContextHelpSymbol] = useState<ProgSymbol>();

  return (
    <div className="editor">
      <DndContext collisionDetection={collisionDetection} onDragEnd={onBlockDragEnd}>
        <div className="blocks">
          {trees.map((tree) => (
            <div
              key={tree.id}
              style={{
                position: "absolute",
                top: `calc(max(var(--menu-bar-height) + 20px, ${tree.location.y}px))`,
                left: `calc(max(40px, ${tree.location.x}px))`,
              }}
            >
              {renderExpr(tree, tree.root)}
            </div>
          ))}
        </div>

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

  function onBlockDragEnd({ active, over, activatorEvent }: DragEndEvent) {
    const activeIndexPath = indexPathFromDragged(active);
    if (!activeIndexPath) return;

    const overIndexPath = indexPathFromDragged(over);
    if (!overIndexPath) {
      orphanExpr(
        activeIndexPath,
        {
          x: active!.rect.current.translated!.left,
          y: active!.rect.current.translated!.top,
        },
        active.data.current?.copyOnDrop
      );
      rerender();
      return;
    }

    if (active.data.current?.copyOnDrop) {
      copyExprInTree(activeIndexPath, overIndexPath, {
        x: over!.rect.right,
        y: over!.rect.bottom,
      });
    } else {
      moveExprInTree(activeIndexPath, overIndexPath, {
        x: over!.rect.right,
        y: over!.rect.bottom,
      });
    }
    rerender();
  }
}
