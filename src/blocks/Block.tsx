import { PropsWithChildren, useRef } from "react";
import { ProgSymbol } from "../symbol-table";
import { Over, UniqueIdentifier, useDraggable, useDroppable } from "@dnd-kit/core";
import { callEach } from "../util";
import { Expr, SExpr, TreeIndexPath, exprAtIndexPath, extendIndexPath, isSExpr } from "../ast/ast";
import BlockPullTab from "./BlockPullTab";

type Props = PropsWithChildren<{
  id: UniqueIdentifier;
  indexPath: TreeIndexPath;

  data: Vertical | Horizontal | Identifier | Number | Bool | Hole;
  isCopySource?: boolean;

  activeDrag?: TreeIndexPath;
  forDragOverlay?: boolean | Over;

  onMouseOver?: (symbol: ProgSymbol | number | boolean | undefined) => void;
  onMouseOut?: (symbol: ProgSymbol | number | boolean | undefined) => void;
  onContextMenu?: (indexPath: TreeIndexPath) => void;

  rerender?: () => void;
}>;

type Vertical = {
  type: "v";
  symbol: ProgSymbol;
  heading?: JSX.Element;
};
type Horizontal = {
  type: "h";
  symbol: ProgSymbol;
  definesSymbol?: boolean;
};
type Identifier = {
  type: "ident";
  symbol: ProgSymbol;
  definesSymbol?: boolean;
};
type Number = {
  type: "number";
  value: { n: number };
};
type Bool = {
  type: "bool";
  value: boolean;
};
type Hole = {
  type: "hole";
};

export default function Block({
  id,
  indexPath,

  data,
  isCopySource,

  activeDrag,
  forDragOverlay,

  children,

  onMouseOver,
  onMouseOut,
  onContextMenu,

  rerender,
}: Props) {
  // Drop area, if applicable
  let { isOver, setNodeRef: setNodeRef1 } = useDroppable({
    id,
    data: { indexPath },
  });
  if (isCopySource || indexPath.path.length === 0) {
    // Not a drop area
    isOver = false;
    setNodeRef1 = () => {};
  }

  // Draggable, if applicable
  let {
    active,
    over,
    attributes,
    listeners,
    setNodeRef: setNodeRef2,
  } = forDragOverlay
    ? ({} as any)
    : useDraggable({
        id,
        data: {
          indexPath,
          copyOnDrop: isCopySource,
          contextHelpSubject: contextHelpSubjectFromData(),
        },
      });
  if (forDragOverlay || data.type === "hole") {
    // Not draggable
    active = null;
    over = typeof forDragOverlay === "object" ? forDragOverlay : null;
    attributes = [] as any;
    listeners = [] as any;
    setNodeRef2 = () => {};
  }

  const expr = (() => {
    try {
      return exprAtIndexPath(indexPath);
    } catch {
      return undefined;
    }
  })();

  const divRef = useRef<HTMLElement | null>(null);

  return (
    <div
      ref={callEach(setNodeRef1, setNodeRef2, (div) => (divRef.current = div))}
      {...listeners}
      {...attributes}
      style={{
        display: "flex",
        flexFlow: "row",
        alignItems: "stretch",

        visibility: !isCopySource && active?.id === id ? "hidden" : "unset",
        // Replaced with DragOverlay:
        // transform: CSS.Translate.toString(transform)
      }}
      className="block-outer-container"
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();

        onContextMenu?.(indexPath);
      }}
    >
      <div
        ref={(div) => (divRef.current = div)}
        style={{
          zIndex: indexPath.tree.zIndex,
        }}
        className={`block block-${data.type} ${isCopySource ? "block-copy-source" : ""} ${
          forDragOverlay ? "block-dragging" : isOver ? "block-dragged-over" : ""
        } ${forDragOverlay && over?.id === "library" ? "block-drop-will-delete" : ""}`}
        onMouseOver={(event) =>
          (event.target as Element).closest(".block:not(.block-hole)") === divRef.current &&
          onMouseOver?.(contextHelpSubjectFromData())
        }
        onMouseOut={(event) =>
          (event.target as Element).closest(".block:not(.block-hole)") === divRef.current &&
          onMouseOut?.(contextHelpSubjectFromData())
        }
      >
        {renderData()}
      </div>

      {data.type === "h" &&
        isSExpr(expr) &&
        expr.args.length < (data.symbol.maxArgCount ?? Infinity) && (
          <BlockPullTab
            id={`${id}-pull-tab`}
            indexPath={extendIndexPath(indexPath, 1 /* called */ + expr.args.length)}
            isCopySource={isCopySource}
          />
        )}
    </div>
  );

  function contextHelpSubjectFromData() {
    switch (data.type) {
      case "v":
      case "h":
      case "ident":
        return data.symbol;
      case "number":
        return data.value.n;
      case "bool":
        return data.value;
    }
  }

  function renderData() {
    switch (data.type) {
      case "v": {
        const { symbol, heading } = data;

        return (
          <>
            <div className="block-v-heading">
              <div className="block-v-label">{symbol.id}</div>
              {heading}
            </div>

            {children}
          </>
        );
      }

      case "h": {
        const { symbol, definesSymbol } = data;

        return (
          <>
            {!definesSymbol && <div className="block-h-label">{symbol.id}</div>}

            {children}
          </>
        );
      }

      case "ident": {
        const { symbol } = data;

        return symbol.id;
      }

      case "number": {
        const { value } = data;

        return <div>{value.n}</div>;
      }

      case "bool": {
        const { value } = data;

        return <div>{value ? "true" : "false"}</div>;
      }

      case "hole": {
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 96 960 960" height="8" width="8">
            <path d="M480.138 1001q-88.138 0-165.625-33.084-77.488-33.083-135.417-91.012T88.084 741.625Q55 664.276 55 576.138 55 487 88.084 409.513q33.083-77.488 90.855-134.969 57.772-57.482 135.195-91.013Q391.557 150 479.779 150q89.221 0 166.827 33.454 77.605 33.453 135.012 90.802 57.407 57.349 90.895 134.877Q906 486.66 906 576q0 88.276-33.531 165.747-33.531 77.471-91.013 135.278-57.481 57.808-134.831 90.891Q569.276 1001 480.138 1001ZM480 907q138 0 234.5-96.372T811 576q0-138-96.5-234.5t-235-96.5q-137.5 0-234 96.5t-96.5 235q0 137.5 96.372 234T480 907Zm0-331Z" />
          </svg>
        );
      }
    }
  }
}
