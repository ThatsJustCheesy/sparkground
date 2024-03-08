import { PropsWithChildren, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Over, UniqueIdentifier, useDraggable, useDroppable } from "@dnd-kit/core";
import { ContextMenuTrigger } from "rctx-contextmenu";
import { callEach } from "../../util";
import { TreeIndexPath, nodeAtIndexPath, extendIndexPath, unboundReferences } from "../trees/tree";
import BlockPullTab from "./BlockPullTab";
import Tippy from "@tippyjs/react";
import { followCursor } from "tippy.js";
import { Type } from "../../typechecker/type";
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
import { InitialTypeContext } from "../typecheck";
import { Point, newTree } from "../trees/trees";
import { moveExprInTree } from "../trees/mutate";
import { Typechecker } from "../../typechecker/typecheck";

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

  typechecker: Typechecker;
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
  | TypeData
  | TypeNameBinding
  | TypeNameHole
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
  binding?: Binding<Value>;
};
type TypeNameBinding = {
  type: "type-name-binding";
  id: string;
};
type NameHole = {
  type: "name-hole";
};
type TypeData = {
  type: "type";
  id: string;
};
type TypeNameHole = {
  type: "type-name-hole";
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

  typechecker,
  identifierTag,

  forDragOverlay,

  children,
}: Props) {
  const activeDrag = useContext(ActiveDragContext);

  const onContextMenu = useContext(OnContextMenuContext);

  const rerender = useContext(RerenderContext);
  useContext(RenderCounterContext);

  const isAnyType = data.type === "type" && data.id === "?";
  const nameable =
    (data.type === "name-hole" || data.type === "type-name-hole") &&
    !indexPath.tree.id.startsWith("library");
  const preventDrag = nameable || isAnyType;

  // Drop area, if applicable
  const droppable = !(isCopySource || indexPath.path?.length === 0);
  // Need to call useDroppable hook on *every* render
  const usedDroppable = useDroppable({
    id,
    data: { indexPath },
  });
  let { isOver, setNodeRef: setNodeRef1 } = droppable
    ? usedDroppable
    : {
        isOver: false,
        setNodeRef: () => {},
      };

  const contextHelpSubject = contextHelpSubjectFromData();

  // Draggable, if applicable
  const draggable = !(
    forDragOverlay ||
    data.type === "hole" ||
    data.type === "name-hole" ||
    data.type === "type-name-hole" ||
    isAnyType
  );
  // Also need to call useDraggable hook on *every* render
  const usedDraggable = useDraggable({
    id,
    data: {
      indexPath,
      copyOnDrop: isCopySource,
      contextHelpSubject: contextHelpSubject,
    },
  });
  let {
    active,
    over,
    attributes,
    listeners,
    setNodeRef: setNodeRef2,
  } = draggable
    ? usedDraggable
    : {
        active: null,
        over: typeof forDragOverlay === "object" ? forDragOverlay : null,
        attributes: [],
        listeners: [],
        setNodeRef: () => {},
      };

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
      setType(typechecker.inferSubexprType(indexPath));
    } catch (error) {
      setType(describeInferenceError(error) ?? `${error}`);
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

  let typecheckingError = typechecker.errors.for(indexPath);
  if (!typecheckingError && expr?.kind === "call") {
    typecheckingError = typechecker.errors.for(extendIndexPath(indexPath, 0));
  }

  const tooltipContentParts = [
    data.type === "name-binding" && <small>Right-click to rename this variable</small>,
    nameable && (
      <small>Click to name this {data.type === "type-name-hole" ? "type " : ""}variable</small>
    ),
    isAnyType && <small>Unknown type; you can drop a more specific type here</small>,

    // Uncomment to see each block's index path in its tooltip:
    // <>
    //   <b>Index Path:</b> {indexPath.path.map((x) => `${x}`).join(" ")}
    // </>,

    // Uncomment to see unbound references in each block's subtree, when considered
    // in isolation from its true context:
    // <>
    //   <b>Subtree Unbound References:</b>{" "}
    //   {unboundReferences(indexPath)
    //     .map((varRef) => varRef.id)
    //     .join(", ")}
    // </>,

    !!typecheckingError && (
      <span className="text-warning">
        <b>Type Error:</b> <i>{describeInferenceError(typecheckingError)}</i>{" "}
      </span>
    ),
    data.type !== "type" && data.type !== "type-name-binding" && data.type !== "type-name-hole" && (
      <>
        <b>Type:</b>{" "}
        {typeof type === "string" ? (
          <span className="text-warning">
            Error: <i>{type}</i>{" "}
          </span>
        ) : (
          serializeType(type)
        )}
      </>
    ),

    contextHelp && (
      <>
        <b>Help:</b>
        <div className="mt-1 ms-2">{contextHelp}</div>
      </>
    ),
  ].filter((x) => x);

  const tooltipContent = tooltipContentParts.length ? (
    <div className="d-flex flex-column mb-1" style={{ gap: "0.5em" }}>
      {tooltipContentParts.map((part, index) => (
        <div key={index}>{part}</div>
      ))}
    </div>
  ) : (
    ""
  );

  const contextMenuID = (() => {
    // TODO: Fix this unbound reference detection
    //       (it doesn't have access to the correct environment at the moment)
    // const evaluable = expr && unboundReferences(indexPath).length === 0 ? "-evaluable" : "";
    const evaluable = "-evaluable";

    switch (data.type) {
      case "ident":
        return "block-menu-var" + evaluable;
      case "name-binding":
        return data.binding?.attributes?.typeAnnotation
          ? "block-menu-namebinding-annotated"
          : "block-menu-namebinding";
      case "name-hole":
        return "block-menu-namehole";
      case "type-name-binding":
        return "block-menu-typenamebinding";
      case "type-name-hole":
        return "block-menu-typenamehole";
      case "h":
      case "v":
        return (data.calledIsVar ? "block-menu-call" : "block-menu") + evaluable;
      case "happly":
        return (data ? "block-menu-apply" : "block-menu") + evaluable;
    }

    return "block-menu" + evaluable;
  })();

  const validDraggedOver =
    isOver && (data.type !== "type" || (activeDrag?.node.kind === "type" && data.type === "type"));

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
          visible={!!tooltipContent && tooltipVisible && !forDragOverlay}
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
            data-no-dnd={preventDrag}
            onClick={
              nameable
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();

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
                draggable || forDragOverlay ? "block-draggable" : ""
              } ${nameable ? "block-nameable" : ""} ${
                forDragOverlay ? "block-dragging" : validDraggedOver ? "block-dragged-over" : ""
              } ${forDragOverlay && over?.id === "library" ? "block-drop-will-delete" : ""} ${
                !!typecheckingError ? "block-error" : ""
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
      case "symbol": {
        const { id } = data;

        return id;
      }

      case "name-binding":
      case "type-name-binding":
      case "type": {
        const { id } = data;

        return (
          <>
            {id}

            {children}
          </>
        );
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
        return <div className="block-hole-symbol" />;
      }

      case "name-hole": {
        return <div className="block-name-hole-symbol" />;
      }

      case "type-name-hole": {
        return <div className="block-type-name-hole-symbol" />;
      }
    }
  }
}
