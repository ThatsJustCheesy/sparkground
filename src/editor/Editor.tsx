import "./editor.css";
import { useEffect, useRef, useState } from "react";
import { Renderer } from "./trees/render";
import {
  TreeIndexPath,
  nodeAtIndexPath,
  isAncestor,
  rootIndexPath,
  setChildAtIndex,
} from "./trees/tree";
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
import { moveExprInTree, copyExprInTree, orphanExpr, deleteExpr } from "./trees/mutate";
import Library from "./library/Library";
import { Tree, bringTreeToFront } from "./trees/trees";
import CodeEditorModal from "./CodeEditorModal";
import { Call, Expr } from "../expr/expr";
import { Parser } from "../expr/parse";
import {
  ActiveDragContext,
  OnContextMenuContext,
  RenderCounterContext,
  RerenderContext,
} from "./editor-contexts";
import { InitialEnvironment } from "./library/environments";

export type Props = {
  trees: Tree[];

  onBlockContextMenu: (indexPath: TreeIndexPath) => void;

  codeEditorSubject: TreeIndexPath | undefined;
  setCodeEditorSubject: (indexPath?: TreeIndexPath) => void;

  rerender: () => void;
  renderCounter: number;
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

export type ActiveDrag = {
  node: Expr;
  indexPath: TreeIndexPath;
  copyOnDrop?: boolean;
};

let isAltPressed = false;

export default function Editor({
  trees,
  onBlockContextMenu,
  rerender,
  codeEditorSubject,
  setCodeEditorSubject,
  renderCounter,
}: Props) {
  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      isAltPressed = event.altKey;
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, []);

  const [weakRenderCounter, setWeakRenderCounter] = useState(0);
  function weakRerender() {
    setWeakRenderCounter(weakRenderCounter + 1);
  }

  const [activeDrag, setActiveDrag] = useState<ActiveDrag>();
  const [activeDragOver, setActiveDragOver] = useState<Over>();

  const blocksArea = useRef<HTMLDivElement>(null);

  return (
    <div className="editor">
      <DndContext
        autoScroll={false}
        collisionDetection={collisionDetection}
        onDragStart={onBlockDragStart}
        onDragOver={onBlockDragOver}
        onDragEnd={onBlockDragEnd}
      >
        <OnContextMenuContext.Provider value={onBlockContextMenu}>
          <ActiveDragContext.Provider value={activeDrag}>
            <RerenderContext.Provider value={weakRerender}>
              <RenderCounterContext.Provider value={renderCounter}>
                <CodeEditorModal indexPath={codeEditorSubject} onClose={onCodeEditorClose} />
                <div className="blocks" ref={blocksArea}>
                  <div
                    style={{
                      width:
                        Math.max(...trees.map((tree) => tree.location.x)) +
                        document.documentElement.clientWidth / 2,
                      height:
                        Math.max(...trees.map((tree) => tree.location.y)) +
                        document.documentElement.clientHeight / 2,
                    }}
                  />
                  {trees.map((tree) => (
                    <div
                      key={tree.id}
                      className="block-pos-container"
                      style={{
                        position: "absolute",
                        width: "fit-content",
                        top: `calc(max(20px, ${tree.location.y}px - var(--menu-bar-height)))`,
                        left: `calc(max(40px, ${tree.location.x}px))`,
                        zIndex: tree.zIndex,
                      }}
                    >
                      {new Renderer(tree, InitialEnvironment, tree.inferrer).render(tree.root, {})}
                    </div>
                  ))}
                </div>

                <DragOverlay dropAnimation={null} zIndex={99999} className="drag-overlay">
                  {activeDrag &&
                    new Renderer(
                      activeDrag.indexPath.tree,
                      // TODO: Do we need to use a better symbol table here?
                      InitialEnvironment,
                      activeDrag.indexPath.tree.inferrer,
                      {
                        forDragOverlay: activeDragOver ?? true,
                      }
                    ).render(activeDrag.node, {
                      indexPath: activeDrag.indexPath,
                    })}
                </DragOverlay>
              </RenderCounterContext.Provider>
            </RerenderContext.Provider>
          </ActiveDragContext.Provider>
        </OnContextMenuContext.Provider>

        <Library />
      </DndContext>
    </div>
  );

  function onCodeEditorClose(newSource?: string) {
    // Close editor
    setCodeEditorSubject(undefined);

    if (!newSource || !codeEditorSubject) return;

    const newExpr = Parser.parseToExpr(newSource);

    if (!codeEditorSubject.path.length) {
      codeEditorSubject.tree.root = newExpr;
    } else {
      setChildAtIndex(
        nodeAtIndexPath({
          tree: codeEditorSubject.tree,
          path: codeEditorSubject.path.slice(0, -1),
        }) as Call,
        codeEditorSubject.path.at(-1)!,
        newExpr
      );
    }
  }

  function indexPathFromDragged(item: Active | Over | null): TreeIndexPath | undefined {
    return item?.data?.current?.indexPath;
  }

  function onBlockDragStart({ active }: DragStartEvent) {
    setTimeout(() => {
      const activeIndexPath = indexPathFromDragged(active);
      if (!activeIndexPath) return;

      setActiveDrag({
        node: nodeAtIndexPath(activeIndexPath),
        indexPath: activeIndexPath,
        copyOnDrop: isAltPressed,
      });
    });
  }

  function onBlockDragOver({ over }: DragOverEvent) {
    setActiveDragOver(over ?? undefined);
  }

  function onBlockDragEnd({ active, over, activatorEvent }: DragEndEvent) {
    setActiveDrag(undefined);
    setActiveDragOver(undefined);

    let activeIndexPath = indexPathFromDragged(active);
    if (!activeIndexPath) return;

    const shouldCopy =
      active.data.current?.copyOnDrop ||
      (activatorEvent instanceof MouseEvent && activatorEvent.altKey);

    if (over?.data.current?.isLibrary) {
      if (shouldCopy) return;

      deleteExpr(activeIndexPath);

      rerender();
      return;
    }

    const overIndexPath = indexPathFromDragged(over);

    // Adjust coordinates of drop point to account for context of scrolled container
    active!.rect.current.translated!.top += blocksArea.current!.scrollTop + 4.5;
    active!.rect.current.translated!.bottom += blocksArea.current!.scrollTop;
    active!.rect.current.translated!.left += blocksArea.current!.scrollLeft;
    active!.rect.current.translated!.right += blocksArea.current!.scrollLeft;

    if (
      /* Dropped on top of nothing */
      !overIndexPath ||
      /* Dropped on root of a tree; just treat like movement */
      over?.data.current?.indexPath.path.length === 0 ||
      /* Dropped on a descendant of itself; just treat like movement */
      isAncestor(activeIndexPath, overIndexPath)
    ) {
      const orphanTree = orphanExpr(
        activeIndexPath,
        {
          x: active!.rect.current.translated!.left,
          y: active!.rect.current.translated!.top,
        },
        shouldCopy
      );
      activeIndexPath = rootIndexPath(orphanTree);
    } else {
      if (shouldCopy) {
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
