import { PropsWithChildren, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Over, UniqueIdentifier, useDraggable, useDroppable } from "@dnd-kit/core";
import { ContextMenuTrigger } from "rctx-contextmenu";
import { callEach } from "../../util";
import { TreeIndexPath, nodeAtIndexPath, extendIndexPath } from "../trees/tree";
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

  forDragOverlay?: boolean | Over;
}>;

export type BlockData =
  | Vertical
  | Horizontal
  | HorizontalApply
  | HorizontalList
  | Identifier
  | Symbol
  | Number
  | Bool
  | Hole;

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
  isNameBinding?: boolean;
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
    rerender?.();
  }, [tooltipVisible, activeDrag]);

  const tooltipContent = (
    <>
      <b>Type:</b>{" "}
      {typeof type === "string" ? (
        <span className="text-warning">
          Error: <i>{type}</i>{" "}
        </span>
      ) : (
        serializeType(type)
      )}
      <br />
      <div className="mt-2">
        {data.type === "ident" && data.isNameBinding && (
          <>
            <small>
              Rename: <kbd>Right click</kbd>
            </small>
            <br />
          </>
        )}
        {
          <>
            <b>Help:</b>
            <div className="mt-1 ms-2">
              {typeof contextHelpSubject === "number" ? (
                <div>{"right-click to change value"}</div>
              ) : typeof contextHelpSubject === "boolean" ? (
                <div className="fst-italic">{contextHelpSubject.toString()}</div>
              ) : typeof contextHelpSubject === "object" ? (
                <>
                  <div className="fst-mono d-flex align-items-end">
                    ({contextHelpSubject.name}
                    <div className="ms-2 fst-italic">
                      {contextHelpSubject.cell.value?.kind === "fn"
                        ? " " +
                          contextHelpSubject.cell.value.signature
                            .map((param) => param.name)
                            .join(" ")
                        : ""}
                    </div>
                    )
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
              ) : (
                <></>
              )}
            </div>
          </>
        }
      </div>
    </>
  );

  const contextMenuID = (() => {
    switch (data.type) {
      case "ident":
        if (data.isNameBinding) return "block-menu-namebinding";
        return "block-menu-var";
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
          >
            <div
              ref={(div) => (divRef.current = div)}
              style={{
                zIndex: indexPath.tree.zIndex,
              }}
              className={`block block-${data.type} ${isCopySource ? "block-copy-source" : ""} ${
                forDragOverlay ? "block-dragging" : isOver ? "block-dragged-over" : ""
              } ${forDragOverlay && over?.id === "library" ? "block-drop-will-delete" : ""} ${
                hasError ? "block-error" : ""
              }`}
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
      case "v":
      case "h":
      case "ident":
        return data.binding;
      case "number":
        return data.value;
      case "bool":
        return data.value;
    }
  }

  function renderData() {
    switch (data.type) {
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
        const { id, definesSymbol } = data;

        return (
          <>
            {!definesSymbol && <div className="block-h-label">{id}</div>}

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
