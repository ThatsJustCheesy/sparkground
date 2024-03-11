import "./editor.css";
import { useEffect, useRef, useState } from "react";
import { Renderer } from "./trees/render";
import {
  TreeIndexPath,
  nodeAtIndexPath,
  isAncestor,
  rootIndexPath,
  referencesToBinding,
  parentIndexPath,
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
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  moveExprInTree,
  copyExprInTree,
  orphanExpr,
  deleteExpr,
  replaceExpr,
} from "./trees/mutate";
import Library from "./library/Library";
import { Tree, bringTreeToFront } from "./trees/trees";
import CodeEditorModal from "./CodeEditorModal";
import { Define, Expr, Var } from "../expr/expr";
import { Parser } from "../expr/parse";
import {
  ActiveDragContext,
  OnContextMenuContext,
  RenderCounterContext,
  RerenderContext,
} from "./editor-contexts";
import { InitialEnvironment } from "./library/environments";
import { CustomKeyboardSensor, CustomPointerSensor } from "./blocks/drag-sensors";
import Split from "react-split";
import { Typechecker } from "../typechecker/typecheck";
import ValueEditorModal from "./ValueEditorModal";
import { OutputArea } from "./OutputArea";

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
  const typechecker = new Typechecker();
  trees
    .filter((tree) => tree.root.kind === "define" && tree.root.name.kind === "name-binding")
    .forEach((tree) => {
      typechecker.addDefine(tree as Tree<Define>);
    });

  const [valueEditorSubject, setValueEditorSubject] = useState<TreeIndexPath>();

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

  function provideEditorContext(body: JSX.Element) {
    return (
      <OnContextMenuContext.Provider value={onBlockContextMenu}>
        <ActiveDragContext.Provider value={activeDrag}>
          <RerenderContext.Provider value={weakRerender}>
            <RenderCounterContext.Provider value={renderCounter}>
              {body}
            </RenderCounterContext.Provider>
          </RerenderContext.Provider>
        </ActiveDragContext.Provider>
      </OnContextMenuContext.Provider>
    );
  }

  return (
    <DndContext
      autoScroll={false}
      sensors={useSensors(
        useSensor(CustomPointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(CustomKeyboardSensor)
      )}
      collisionDetection={collisionDetection}
      onDragStart={onBlockDragStart}
      onDragOver={onBlockDragOver}
      onDragEnd={onBlockDragEnd}
    >
      {provideEditorContext(
        <>
          <CodeEditorModal indexPath={codeEditorSubject} onClose={onCodeEditorClose} />
          <ValueEditorModal indexPath={valueEditorSubject} onClose={onValueEditorClose} />

          <DragOverlay dropAnimation={null} zIndex={99999} className="drag-overlay">
            {activeDrag &&
              new Renderer(
                // TODO: Do we need to use a better symbol table here?
                InitialEnvironment,
                typechecker,
                {
                  forDragOverlay: activeDragOver ?? true,
                }
              ).render(activeDrag.indexPath)}
          </DragOverlay>
        </>
      )}

      <Split
        className="editor-split split"
        direction="horizontal"
        cursor="col-resize"
        sizes={[78, 22]}
        minSize={[0, 0]}
        snapOffset={120}
        gutterSize={12}
        gutterAlign="center"
      >
        <Split
          className="canvas-split split"
          direction="vertical"
          cursor="row-resize"
          sizes={[40, 60]}
          minSize={[0]}
          snapOffset={120}
          gutterSize={12}
          gutterAlign="center"
        >
          <OutputArea></OutputArea>

          {provideEditorContext(
            <>
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
                    {new Renderer(InitialEnvironment, typechecker, {
                      onEditValue,
                    }).render(rootIndexPath(tree))}
                  </div>
                ))}
              </div>
            </>
          )}
        </Split>

        <Library />
      </Split>
    </DndContext>
  );

  async function onEditValue(indexPath: TreeIndexPath) {
    const node = nodeAtIndexPath(indexPath);
    switch (node.kind) {
      case "name-binding":
        const references: Var[] = referencesToBinding(node.id, parentIndexPath(indexPath));

        const newName = prompt("Enter variable name:");
        if (!newName) return;

        node.id = newName;
        references.forEach((ref) => {
          ref.id = newName;
        });
        break;
      case "Boolean":
        node.value = !node.value;
        break;
      case "Number":
      case "String":
        setValueEditorSubject(indexPath);
        break;
      default:
        setCodeEditorSubject(indexPath);
        break;
    }
  }

  function onCodeEditorClose(newSource?: string) {
    // Close editor
    setCodeEditorSubject(undefined);

    if (!newSource || !codeEditorSubject) return;

    const newExpr = Parser.parseToExpr(newSource);
    replaceExpr(codeEditorSubject, newExpr);
  }

  function onValueEditorClose(newNode?: Expr) {
    // Close editor
    setValueEditorSubject(undefined);

    if (!newNode || !valueEditorSubject) return;

    replaceExpr(valueEditorSubject, newNode);
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

    const dragBounds = active!.rect.current.translated!;

    // Adjust coordinates of drop point to account for context of scrolled container
    const blocksAreaEl = blocksArea.current!;
    const shiftY = blocksAreaEl.scrollTop - blocksAreaEl.getBoundingClientRect().top + 48;
    const shiftX = blocksAreaEl.scrollLeft;
    dragBounds.top += shiftY;
    dragBounds.bottom += shiftY;
    dragBounds.left += shiftX;
    dragBounds.right += shiftX;

    const overIndexPath = indexPathFromDragged(over);

    if (
      /* Dropped on top of nothing */
      !overIndexPath ||
      /* Dropped on root of a tree; just treat like movement */
      overIndexPath.path.length === 0 ||
      /* Dropped on a descendant of itself; just treat like movement */
      isAncestor(activeIndexPath, overIndexPath) ||
      /* Non-type block dropped in type context */
      (nodeAtIndexPath({
        tree: overIndexPath.tree,
        path: overIndexPath.path.slice(0, -1),
      }).kind === "type" &&
        nodeAtIndexPath(activeIndexPath).kind !== "type")
    ) {
      const orphanTree = orphanExpr(
        activeIndexPath,
        {
          x: dragBounds.left,
          y: dragBounds.top,
        },
        shouldCopy
      );
      activeIndexPath = rootIndexPath(orphanTree);
    } else {
      if (shouldCopy) {
        copyExprInTree(activeIndexPath, overIndexPath, {
          x: dragBounds.right,
          y: dragBounds.bottom,
        });
      } else {
        moveExprInTree(activeIndexPath, overIndexPath, {
          x: dragBounds.right,
          y: dragBounds.bottom,
        });
      }
    }

    bringTreeToFront(activeIndexPath.tree);
    rerender();
  }
}
