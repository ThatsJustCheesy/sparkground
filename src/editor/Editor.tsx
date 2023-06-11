import "./editor.css";
import { useState } from "react";
import { ProgSymbol } from "../symbol-table";
import { renderExpr } from "../ast/render";
import { TreeIndexPath, exprAtIndexPath, isAncestor } from "../ast/ast";
import {
  Active,
  ClientRect,
  CollisionDescriptor,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  Over,
} from "@dnd-kit/core";
import { moveExprInTree, copyExprInTree, orphanExpr, deleteExpr } from "../ast/mutate";
import Library from "../library/Library";
import { Tree, bringTreeToFront } from "../ast/trees";

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

function midY(rect: ClientRect) {
  return (rect.top + rect.bottom) / 2;
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
        (id === "library" ||
          Math.abs(midY(rect) - midY(collisionRect)) <=
            Math.max(rect.height / 2, collisionRect.height / 2)) &&
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
  const [contextHelpSubject, setContextHelpSubject] = useState<ProgSymbol | boolean>();
  const [activeDrag, setActiveDrag] = useState<TreeIndexPath>();
  const [activeDragOver, setActiveDragOver] = useState<Over>();

  return (
    <div className="editor">
      <DndContext
        autoScroll={false}
        collisionDetection={collisionDetection}
        onDragStart={onBlockDragStart}
        onDragOver={onBlockDragOver}
        onDragEnd={onBlockDragEnd}
      >
        <div className="blocks">
          {trees.map((tree) => (
            <div
              key={tree.id}
              className="block-pos-container"
              style={{
                position: "absolute",
                top: `calc(max(var(--menu-bar-height) + 20px, ${tree.location.y}px))`,
                left: `calc(max(40px, ${tree.location.x}px))`,
                zIndex: tree.zIndex,
              }}
            >
              {renderExpr(tree, tree.root, { onMouseOver, onMouseOut, activeDrag, rerender })}
            </div>
          ))}
        </div>

        <Library contextHelpSubject={contextHelpSubject} />

        <DragOverlay dropAnimation={null} zIndex={999999}>
          {activeDrag &&
            renderExpr(activeDrag.tree, exprAtIndexPath(activeDrag), {
              forDragOverlay: activeDragOver ?? true,
            })}
        </DragOverlay>
      </DndContext>
    </div>
  );

  function onMouseOver(symbol: ProgSymbol | number | boolean | undefined) {
    if (symbol === undefined) return;

    setContextHelpSubject(symbol);
  }

  function onMouseOut(symbol: ProgSymbol | number | boolean | undefined) {
    if (symbol === undefined || activeDrag) return;

    if (symbol === contextHelpSubject) {
      setContextHelpSubject(undefined);
    }
  }

  function indexPathFromDragged(item: Active | Over | null): TreeIndexPath | undefined {
    return item?.data?.current?.indexPath;
  }

  function onBlockDragStart({ active }: DragStartEvent) {
    const activeIndexPath = indexPathFromDragged(active);
    if (!activeIndexPath) return;

    setActiveDrag(activeIndexPath);
    setContextHelpSubject(active.data.current?.contextHelpSubject);
  }

  function onBlockDragOver({ over }: DragOverEvent) {
    setActiveDragOver(over ?? undefined);
  }

  function onBlockDragEnd({ active, over }: DragEndEvent) {
    setActiveDrag(undefined);
    setActiveDragOver(undefined);

    const activeIndexPath = indexPathFromDragged(active);
    if (!activeIndexPath) return;

    if (over?.data.current?.isLibrary) {
      if (active.data.current?.copyOnDrop) return;

      deleteExpr(activeIndexPath);
      setContextHelpSubject(undefined);

      rerender();
      return;
    }

    const overIndexPath = indexPathFromDragged(over);
    if (
      /* Dropped on top of nothing */
      !overIndexPath ||
      /* Dropped on root of a tree; just treat like movement */
      over?.data.current?.indexPath.path.length === 0 ||
      /* Dropped on a descendant of itself; just treat like movement */
      isAncestor(activeIndexPath, overIndexPath)
    ) {
      orphanExpr(
        activeIndexPath,
        {
          x: active!.rect.current.translated!.left,
          y: active!.rect.current.translated!.top,
        },
        active.data.current?.copyOnDrop
      );
    } else {
      if (active.data.current?.copyOnDrop) {
        copyExprInTree(activeIndexPath, overIndexPath, {
          x: active!.rect.current.translated!.right,
          y: active!.rect.current.translated!.bottom,
        });
      } else {
        moveExprInTree(activeIndexPath, overIndexPath, {
          x: active!.rect.current.translated!.right,
          y: active!.rect.current.translated!.bottom,
        });
      }
    }

    bringTreeToFront(activeIndexPath.tree);
    rerender();
  }
}
