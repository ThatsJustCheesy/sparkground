import "./editor.css";
import { useEffect, useRef, useState } from "react";
import { ProgSymbol, SymbolTable } from "./symbol-table";
import { Renderer } from "./trees/render";
import {
  TreeIndexPath,
  exprAtIndexPath,
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
import BiwaScheme from "biwascheme";
import CodeEditorModal from "./CodeEditorModal";
import { Call } from "../expr/expr";
import { Parser } from "../expr/parse";

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

  const [result, setResult] = useState<any>();
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>();
  const [activeDragOver, setActiveDragOver] = useState<Over>();

  const [stage, setStage] = useState<{ element: JSX.Element }[]>([]);

  useEffect(() => {
    (async () => {
      const interpreter = new BiwaScheme.Interpreter((error: any) => console.error(error));

      stage.splice(0, stage.length);

      BiwaScheme.define_libfunc("text", 1, 1, ([text]: [any]) => {
        const newObject = { element: <>{`${text}`}</> };
        stage.push(newObject);
        setStage([...stage]);

        return newObject;
      });
      BiwaScheme.define_libfunc(
        "rotate",
        2,
        2,
        ([degrees, object]: [number, { element: JSX.Element }]) => {
          BiwaScheme.assert_real(degrees);

          object.element = (
            <div style={{ position: "relative", transform: `rotate(${degrees}deg)` }}>
              {object.element}
            </div>
          );

          setStage([...stage]);

          return object;
        }
      );

      const newResults = await Promise.all(
        trees.map(async (tree) => {
          // console.log(evaluate(mainTree.root, new Environment()));
          /* --- */
          // const source = serializeExpr(tree.root);
          // console.log(source);
          /* --- */
          // const res = (await new Promise((resolve, reject) => {
          //   interpreter.evaluate(source, resolve);
          // })) as any;
          // return res?.toString();
          /* --- */
          // const js = jsifyExpr(tree.root);
          // console.log(js);
          /* --- */
          // try {
          //   const res = evalInRuntime(js);
          //   return JSON.stringify(res);
          // } catch (error) {
          //   console.error(error);
          //   return "[error]";
          // }
        })
      );
      setResult(newResults.join("\n"));
    })();
  }, [activeDrag, renderCounter]);

  const blocksArea = useRef<HTMLDivElement>(null);

  return (
    <div className="editor">
      <CodeEditorModal indexPath={codeEditorSubject} onClose={onCodeEditorClose} />

      <DndContext
        autoScroll={false}
        collisionDetection={collisionDetection}
        onDragStart={onBlockDragStart}
        onDragOver={onBlockDragOver}
        onDragEnd={onBlockDragEnd}
      >
        <div className="blocks-stage-container">
          <div className="blocks" ref={blocksArea}>
            {trees.map((tree) => (
              <div
                key={tree.id}
                className="block-pos-container"
                style={{
                  position: "absolute", // TODO: relative
                  width: "fit-content",
                  top: `calc(max(var(--menu-bar-height) + 20px, ${tree.location.y}px))`,
                  left: `calc(max(40px, ${tree.location.x}px))`,
                  zIndex: tree.zIndex,
                }}
              >
                {new Renderer(tree, new SymbolTable(), tree.inferrer, {
                  activeDrag,

                  onMouseOver,
                  onMouseOut,
                  onContextMenu: onBlockContextMenu,

                  rerender: weakRerender,
                  renderCounter,
                }).render(tree.root, {})}
              </div>
            ))}
          </div>

          {/* <div className="stage">
            i am stage
            <div style={{ position: "absolute" }}>
              {stage.map(({ element }, index) => (
                <div key={index}>{element}</div>
              ))}
            </div>
          </div> */}
        </div>

        <Library />

        <DragOverlay dropAnimation={null} zIndex={99999}>
          {activeDrag &&
            new Renderer(
              activeDrag.indexPath.tree,
              // TODO: Do we need to use a better symbol table here?
              new SymbolTable(),
              activeDrag.indexPath.tree.inferrer,
              {
                forDragOverlay: activeDragOver ?? true,
              }
            ).render(exprAtIndexPath(activeDrag.indexPath), { indexPath: activeDrag.indexPath })}
        </DragOverlay>
      </DndContext>
    </div>
  );

  function onMouseOver(symbol: ProgSymbol | number | boolean | undefined) {}

  function onMouseOut(symbol: ProgSymbol | number | boolean | undefined) {}

  function onCodeEditorClose(newSource?: string) {
    // Close editor
    setCodeEditorSubject(undefined);

    if (!newSource || !codeEditorSubject) return;

    const newExpr = Parser.parseToExpr(newSource);

    if (!codeEditorSubject.path.length) {
      codeEditorSubject.tree.root = newExpr;
    } else {
      setChildAtIndex(
        exprAtIndexPath({
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
    // console.log(active!.rect.current.translated!.top, blocksArea.current!.scrollTop);
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
