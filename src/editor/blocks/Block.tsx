import { PropsWithChildren, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Over, UniqueIdentifier, useDraggable, useDroppable } from "@dnd-kit/core";
import { ContextMenuTrigger } from "rctx-contextmenu";
import { callEach } from "../../util";
import { TreeIndexPath, nodeAtIndexPath, extendIndexPath, isHole } from "../trees/tree";
import BlockPullTab from "./BlockPullTab";
import Tippy from "@tippyjs/react";
import { followCursor } from "tippy.js";
import { Type } from "../../typechecker/type";
import { TypeInferrer } from "../../typechecker/infer";
import { serializeType } from "../../typechecker/serialize";
import { describeInferenceError } from "../../typechecker/errors";
import {
  ActiveDragContext,
  OnContextMenuContext,
  RenderCounterContext,
  RerenderContext,
} from "../editor-contexts";
import { Binding } from "../library/environments";
import { Value } from "../../evaluator/value";
import { InitialTypeEnvironment } from "../typecheck";
import { Point, newTree } from "../trees/trees";
import { moveExprInTree } from "../trees/mutate";

// TODO: Move this somewhere else or make it obsolete
let isShiftDown = false;
addEventListener("keydown", (event) => {
  if (event.shiftKey) isShiftDown = true;
});
addEventListener("keyup", (event) => {
  if (!event.shiftKey) isShiftDown = false;
});

type Props = PropsWithChildren<{
  id: UniqueIdentifier;
  indexPath: TreeIndexPath;

  data: BlockData;
  isCopySource?: boolean;

  inferrer: TypeInferrer;
  hasError?: boolean;
  identifierTag?: string;

  forDragOverlay?: boolean | Over;
}>;

export type BlockData =
  | Hat
  | Vertical
  | Horizontal
  | HorizontalApply
  | HorizontalList
  | Identifier
  | NameBinding
  | NameHole
  | Symbol
  | Number
  | Bool
  | Hole;

type Hat = {
  type: "hat";
  id: string;
  binding?: Binding<Value>;
  calledIsVar?: boolean;
  heading?: JSX.Element;
};
type Vertical = {
  type: "v";
  id: string;
  binding?: Binding<Value>;
  calledIsVar?: boolean;
  heading?: JSX.Element;
};
type Horizontal = {
  type: "h";
  id: string;
  binding?: Binding<Value>;
  calledIsVar?: boolean;
  definesSymbol?: boolean;
  argCount?: number;
};
type HorizontalApply = {
  type: "happly";
};
type HorizontalList = {
  type: "hlist";
  tail?: ReactNode;
};
type Identifier = {
  type: "ident";
  id: string;
  binding?: Binding<Value>;
};
type NameBinding = {
  type: "name-binding";
  id: string;
  binding: Binding<Value>;
};
type NameHole = {
  type: "name-hole";
};
type Symbol = {
  type: "symbol";
  id: string;
};
type Number = {
  type: "number";
  value: number;
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

  inferrer,
  hasError,
  identifierTag,

  forDragOverlay,

  children,
}: Props) {
  const activeDrag = useContext(ActiveDragContext);

  const onContextMenu = useContext(OnContextMenuContext);

  const rerender = useContext(RerenderContext);
  useContext(RenderCounterContext);

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

  const contextHelpSubject = contextHelpSubjectFromData();

  // Draggable, if applicable
  let draggable = true;
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
          contextHelpSubject: contextHelpSubject,
        },
      });
  if (forDragOverlay || data.type === "hole" || data.type === "name-hole") {
    // Not draggable
    draggable = false;
    active = null;
    over = typeof forDragOverlay === "object" ? forDragOverlay : null;
    attributes = [] as any;
    listeners = [] as any;
    setNodeRef2 = () => {};
  }

  const nameable = data.type === "name-hole" && !indexPath.tree.id.startsWith("library");

  const expr = (() => {
    try {
      return nodeAtIndexPath(indexPath);
    } catch {
      return undefined;
    }
  })();

  const divRef = useRef<HTMLElement | null>(null);

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [type, setType] = useState<Type | string>("");

  useEffect(() => {
    try {
      setType(inferrer.inferSubexpr(indexPath, InitialTypeEnvironment));
    } catch (error) {
      setType(inferrer.error ? describeInferenceError(inferrer.error) : `${error}`);
    }

    if (identifierTag) {
      if (tooltipVisible) {
        document.body.classList.add(`highlight-identifier-${identifierTag}`);
      } else {
        document.body.classList.remove(`highlight-identifier-${identifierTag}`);
      }
    }

    rerender?.();
  }, [tooltipVisible, activeDrag]);

  const contextHelp =
    typeof contextHelpSubject === "number" ? (
      <div>{"right-click to change value"}</div>
    ) : typeof contextHelpSubject === "boolean" ? (
      <div className="fst-italic">{contextHelpSubject.toString()}</div>
    ) : typeof contextHelpSubject === "object" ? (
      <>
        <div className="fst-mono d-flex align-items-end">
          {contextHelpSubject.cell.value?.kind === "fn" ? (
            <>
              ({contextHelpSubject.name}
              <div className="ms-2 fst-italic">
                {contextHelpSubject.cell.value.signature.map((param) => param.name).join(" ")}
              </div>
              )
            </>
          ) : (
            contextHelpSubject.name
          )}
        </div>
        <div className="mt-1">
          {" "}
          {(() => {
            let doc = contextHelpSubject.attributes?.doc;
            if (!doc) return "";

            let match: RegExpExecArray | null;
            let rendered = <></>;
            while ((match = /^(?:[^`]+|`([^`]+)`)/.exec(doc))) {
              doc = doc.slice(match[0].length);
              if (match[1]) {
                rendered = (
                  <>
                    {rendered}
                    <span className="fst-mono fst-italic">{match[1]}</span>
                  </>
                );
              } else {
                rendered = (
                  <>
                    {rendered}
                    {match[0]}
                  </>
                );
              }
            }

            return rendered;
          })()}
        </div>
      </>
    ) : undefined;

  const tooltipContent = (
    <div className="mb-1">
      <b>Type:</b>{" "}
      {typeof type === "string" ? (
        <span className="text-warning">
          Error: <i>{type}</i>{" "}
        </span>
      ) : (
        serializeType(type)
      )}
      {data.type === "name-binding" && (
        <div className="mt-2">
          <small>Right-click to rename this variable</small>
          <br />
        </div>
      )}
      {nameable && (
        <div className="mt-2">
          <small>Click to name this variable</small>
          <br />
        </div>
      )}
      {contextHelp && (
        <div className="mt-2">
          <b>Help:</b>
          <div className="mt-1 ms-2">{contextHelp}</div>
        </div>
      )}
    </div>
  );

  const contextMenuID = (() => {
    switch (data.type) {
      case "ident":
        return "block-menu-var";
      case "name-binding":
        return "block-menu-namebinding";
      case "name-hole":
        return "block-menu-namehole";
      case "h":
      case "v":
        if (data.calledIsVar) return "block-menu-call";
        break;
      case "happly":
        if (data) return "block-menu-apply";
    }
    return "block-menu";
  })();

  return (
    <>
      <style>
        {identifierTag
          ? `
          body.highlight-identifier-${identifierTag} .block-identifier-${identifierTag} > .block-h-label,
          body.highlight-identifier-${identifierTag} .block-identifier-${identifierTag} > .block-v-label,
          body.highlight-identifier-${identifierTag} .block-identifier-${identifierTag}.block-ident,
          body.highlight-identifier-${identifierTag} .block-identifier-${identifierTag}.block-name-binding {
            transition: all 50ms linear;
            
            font-weight: bold;
            
            box-shadow: 0px 0px 0.25em 0.4em rgba(255, 255, 50);
            background-color: rgba(255, 255, 50)
          }
        `
          : ""}
      </style>

      <ContextMenuTrigger id={contextMenuID}>
        <Tippy
          content={tooltipContent}
          className={"text-bg-primary"}
          visible={tooltipVisible && !forDragOverlay}
          arrow={false}
          plugins={[followCursor]}
          followCursor={true}
          offset={[5, 10]}
          placement="top-start"
          zIndex={99999 + 2}
        >
          <div
            ref={callEach(setNodeRef1, setNodeRef2)}
            {...listeners}
            {...attributes}
            style={{
              display: "flex",
              flexFlow: "row",
              alignItems: "stretch",

              visibility:
                !isCopySource && !activeDrag?.copyOnDrop && active?.id === id ? "hidden" : "unset",
              // Replaced with DragOverlay:
              // transform: CSS.Translate.toString(transform)
            }}
            className="block-outer-container"
            onContextMenu={(event) => {
              onContextMenu?.(indexPath);
            }}
            data-no-dnd={nameable}
            onClick={
              nameable
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const nameHole = nodeAtIndexPath(indexPath);
                    if (!isHole(nameHole)) return;

                    const newName = prompt("Enter variable name:");
                    if (!newName) return;

                    const location: Point = { x: 0, y: 0 };
                    const newBinding = newTree(
                      {
                        kind: "name-binding",
                        id: newName,
                      },
                      location
                    );
                    moveExprInTree({ tree: newBinding, path: [] }, indexPath, location);
                    rerender?.();
                  }
                : undefined
            }
          >
            <div
              ref={(div) => (divRef.current = div)}
              style={{
                zIndex: indexPath.tree.zIndex,
              }}
              className={`block block-${data.type} ${
                forDragOverlay ? "block-dragging" : isOver ? "block-dragged-over" : ""
              } ${forDragOverlay && over?.id === "library" ? "block-drop-will-delete" : ""} ${
                hasError ? "block-error" : ""
              } ${identifierTag ? `block-identifier-${identifierTag}` : ""}`}
              onMouseOver={(event) => {
                if ((event.target as Element).closest(".block") === divRef.current) {
                  setTooltipVisible(true);
                }
              }}
              onMouseOut={(event) => {
                if ((event.target as Element).closest(".block") === divRef.current) {
                  setTooltipVisible(false);
                }
              }}
            >
              {renderData()}
            </div>

            {data.type === "hlist" && expr && expr.kind === "list" ? (
              <BlockPullTab
                id={`${id}-pull-tab`}
                indexPath={extendIndexPath(indexPath, 1 /* tail slot */ + expr.heads.length)}
                isCopySource={isCopySource}
              />
            ) : data.type === "happly" && expr && expr.kind === "call" ? (
              <BlockPullTab
                id={`${id}-pull-tab`}
                indexPath={extendIndexPath(indexPath, 1 /* called */ + expr.args.length)}
                isCopySource={isCopySource}
              />
            ) : data.type === "h" &&
              expr &&
              expr.kind === "call" &&
              expr.args.length < (data.binding?.attributes?.maxArgCount ?? Infinity) ? (
              <BlockPullTab
                id={`${id}-pull-tab`}
                indexPath={extendIndexPath(indexPath, 1 /* called */ + expr.args.length)}
                isCopySource={isCopySource}
              />
            ) : (
              ""
            )}
          </div>
        </Tippy>
      </ContextMenuTrigger>
    </>
  );

  function contextHelpSubjectFromData() {
    switch (data.type) {
      case "hat":
      case "v":
      case "h":
      case "ident":
      case "name-binding":
        return data.binding;
      case "number":
        return data.value;
      case "bool":
        return data.value;
    }
  }

  function renderData() {
    switch (data.type) {
      case "hat": {
        const { id, heading } = data;

        return (
          <>
            <div className="block-hat-heading">
              <div className="block-hat-label">{id}</div>
              {heading}
            </div>

            {children}
          </>
        );
      }

      case "v": {
        const { id, heading } = data;

        return (
          <>
            <div className="block-v-heading">
              <div className="block-v-label">{id}</div>
              {heading}
            </div>

            {children}
          </>
        );
      }

      case "h": {
        const { id, binding, definesSymbol, argCount } = data;

        const renderAsInfix = binding?.attributes?.infix && (argCount ?? 0) > 1;

        return (
          <>
            {!definesSymbol && !renderAsInfix && <div className="block-h-label">{id}</div>}

            {children}
          </>
        );
      }

      case "happly": {
        return <>{children}</>;
      }

      case "hlist": {
        const { tail } = data;

        return (
          <>
            {children}

            {tail && <>.{tail}</>}
          </>
        );
      }

      case "ident":
      case "name-binding":
      case "symbol": {
        const { id } = data;

        return id;
      }

      case "number": {
        const { value } = data;

        return <div>{value}</div>;
      }

      case "bool": {
        const { value } = data;

        return <div>{value ? "true" : "false"}</div>;
      }

      case "name-hole":
      case "hole": {
        return <div className="block-hole-symbol" />;
      }
    }
  }
}
