import "./editor.css";
import { useEffect, useRef, useState } from "react";
import { ProgSymbol } from "./symbol-table";
import { renderExpr } from "./ast/render";
import {
  SExpr,
  TreeIndexPath,
  exprAtIndexPath,
  isAncestor,
  isNumericLiteral,
  setChildAtIndex,
} from "./ast/ast";
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
import { moveExprInTree, copyExprInTree, orphanExpr, deleteExpr } from "./ast/mutate";
import Library from "./library/Library";
import { Tree, bringTreeToFront } from "./ast/trees";
import BiwaScheme from "biwascheme";
import { serializeExpr } from "./ast/serialize";
import CodeEditorModal from "./CodeEditorModal";
import { parseToExpr } from "./ast/parse";

export type Props = {
  trees: Tree[];

  rerender(): void;
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

export default function Editor({ trees, rerender, renderCounter }: Props) {
  const [contextHelpSubject, setContextHelpSubject] = useState<ProgSymbol | number | boolean>();
  const [codeEditorSubject, setCodeEditorSubject] = useState<TreeIndexPath>();
  const [result, setResult] = useState<any>();
  const [activeDrag, setActiveDrag] = useState<TreeIndexPath>();
  const [activeDragOver, setActiveDragOver] = useState<Over>();

  const [stage, setStage] = useState<{ element: JSX.Element }[]>([]);

  useEffect(() => {
    (async () => {
      const interpreter = new BiwaScheme.Interpreter((error: any) => console.error(error));

      stage.splice(0, stage.length);

      BiwaScheme.define_libfunc("text", 1, 1, ([text]: [any]) => {
        if (isNumericLiteral(text)) text = text.n;

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

          const source = serializeExpr(tree.root);
          console.log(source);

          const res = (await new Promise((resolve, reject) => {
            interpreter.evaluate(source, resolve);
          })) as any;
          return res?.toString();
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
                {renderExpr(tree, tree.root, {
                  onMouseOver,
                  onMouseOut,
                  onContextMenu,
                  activeDrag,
                  rerender,
                })}
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

        <Library contextHelpSubject={contextHelpSubject} result={result} />

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

  function onContextMenu(indexPath: TreeIndexPath) {
    setCodeEditorSubject(indexPath);
  }

  function onCodeEditorClose(newSource?: string) {
    // Close editor
    setCodeEditorSubject(undefined);

    if (!newSource || !codeEditorSubject) return;

    const newExpr = parseToExpr(newSource);

    if (!codeEditorSubject.path.length) {
      codeEditorSubject.tree.root = newExpr;
    } else {
      setChildAtIndex(
        exprAtIndexPath({
          tree: codeEditorSubject.tree,
          path: codeEditorSubject.path.slice(0, -1),
        }) as SExpr,
        codeEditorSubject.path.at(-1)!,
        newExpr
      );
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
    // console.log(active!.rect.current.translated!.top, blocksArea.current!.scrollTop);
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
