import { PropsWithChildren, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Over, UniqueIdentifier, useDraggable, useDroppable } from "@dnd-kit/core";
import { ContextMenuTrigger } from "rctx-contextmenu";
import { callEach } from "../../util";
import { TreeIndexPath, nodeAtIndexPath, extendIndexPath } from "../trees/tree";
import BlockPullTab from "./BlockPullTab";
import Tippy from "@tippyjs/react";
import { followCursor } from "tippy.js";
import { Type, functionMaxArgCount } from "../../typechecker/type";
import { prettyPrintType } from "../../typechecker/serialize";
import { describeInferenceError } from "../../typechecker/errors";
import {
  ActiveDragContext,
  OnContextMenuContext,
  RenderCounterContext,
  RerenderContext,
} from "../editor-contexts";
import { Binding } from "../library/environments";
import { FnValue, Value } from "../../evaluator/value";
import { Point, newTree } from "../trees/trees";
import { moveExprInTree } from "../trees/mutate";
import { Typechecker } from "../../typechecker/typecheck";

type Props = PropsWithChildren<{
  id: UniqueIdentifier;
  indexPath: TreeIndexPath;

  data: BlockData;
  isCopySource?: boolean;

  typechecker: Typechecker;
  identifierTag?: string;

  forDragOverlay?: boolean | Over;

  onEditValue?: (indexPath: TreeIndexPath) => Promise<void>;
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
  | TypeVarData
  | TypeNameBinding
  | TypeNameHole
  | Symbol
  | String
  | Number
  | Bool
  | Hole;

type Hat = {
  type: "hat";
  id: string;
  binding?: Binding<unknown>;
  calledIsVar?: boolean;
  heading?: JSX.Element;
};
type Vertical = {
  type: "v";
  id: string;
  binding?: Binding<unknown>;
  calledIsVar?: boolean;
  heading?: JSX.Element;
};
type Horizontal = {
  type: "h";
  id: string;
  binding?: Binding<unknown>;
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
  binding?: Binding<unknown>;
};
type NameBinding = {
  type: "name-binding";
  id: string;
  binding?: Binding<unknown>;
};
type TypeNameBinding = {
  type: "type-name-binding";
  id: string;
};
type NameHole = {
  type: "name-hole";
  phantom?: boolean;
};
type TypeData = {
  type: "type";
  id: string;
};
type TypeVarData = {
  type: "type-var";
  id: string;
};
type TypeNameHole = {
  type: "type-name-hole";
};
type Symbol = {
  type: "symbol";
  id: string;
};
type String = {
  type: "string";
  value: string;
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

  onEditValue,

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

  let binding: Binding<unknown> | undefined;
  switch (data.type) {
    case "hat":
    case "v":
    case "h":
    case "ident":
    case "name-binding":
      binding = data.binding;
  }

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
      contextHelpSubject: binding,
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
  const [calledType, setCalledType] = useState<Type>();

  useEffect(() => {
    try {
      setType(typechecker.inferSubexprType(indexPath));
      setCalledType(
        expr?.kind === "call"
          ? typechecker.inferSubexprType(extendIndexPath(indexPath, 0))
          : undefined
      );
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

  let contextHelp: JSX.Element | undefined;

  // TODO: Stop relying on Value bindings here; use a richer `doc` attribute instead
  if (binding && ((binding.cell.value as Value)?.kind === "fn" || binding.attributes?.doc)) {
    const contextHelpName = (
      <div className="fst-mono d-flex align-items-end">
        {
          // TODO: Stop relying on Value bindings here; use a richer `doc` attribute instead
          (binding.cell.value as Value)?.kind === "fn" ? (
            <>
              ({binding.name}
              <div className="ms-2 fst-italic">
                {(binding.cell.value as FnValue).signature
                  .map((param) => param.name + (param.variadic ? "..." : param.optional ? "?" : ""))
                  .join(" ")}
              </div>
              )
            </>
          ) : (
            binding.name
          )
        }
      </div>
    );

    const contextHelpDoc = (
      <div className="mt-1">
        {(() => {
          let doc = binding.attributes?.doc;
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
    );

    contextHelp = (
      <>
        {contextHelpName} {contextHelpDoc}
      </>
    );
  }

  let typecheckingError = typechecker.errors.for(indexPath);
  if (!typecheckingError && expr?.kind === "call") {
    typecheckingError = typechecker.errors.for(extendIndexPath(indexPath, 0));
  }

  const tooltipContentParts = [
    data.type === "name-binding" && <small>Double-click to rename this variable</small>,
    nameable && (
      <small>Click to name this {data.type === "type-name-hole" ? "type " : ""}variable</small>
    ),
    isAnyType && <small>Unknown type; you can drop a more specific type here</small>,
    onEditValue && data.type === "bool" && <small>Double-click to toggle value</small>,
    onEditValue && (data.type === "number" || data.type === "string") && (
      <small>Double-click to edit value</small>
    ),

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
    data.type !== "type" &&
      data.type !== "type-var" &&
      data.type !== "type-name-binding" &&
      data.type !== "type-name-hole" && (
        <>
          <b>Type:</b>
          <div className="mt-1 ms-2">
            {typeof type === "string" ? (
              <span className="text-warning">
                Error: <i>{type}</i>{" "}
              </span>
            ) : (
              <span className="fst-mono">{prettyPrintType(type)}</span>
            )}
          </div>
        </>
      ),
    calledType && (
      <>
        <b>Function Type:</b>
        <div className="mt-1 ms-2">
          <span className="fst-mono">{prettyPrintType(calledType)}</span>
        </div>
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

  const isTypeBlock = (data: BlockData) => data.type === "type" || data.type === "type-var";
  const validDraggedOver = isOver && (!isTypeBlock(data) || activeDrag?.node.kind === "type");

  const isVariadicCall =
    data.type === "h" &&
    expr &&
    expr.kind === "call" &&
    (typeof type !== "string" && calledType
      ? expr.args.length < functionMaxArgCount(calledType)
      : true);
  const isAndOr = expr?.kind === "and" || expr?.kind === "or";

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
                      location,
                      indexPath.tree.page
                    );
                    moveExprInTree({ tree: newBinding, path: [] }, indexPath, location);
                    rerender?.();
                  }
                : undefined
            }
            onDoubleClick={async (event) => {
              event.preventDefault();
              event.stopPropagation();

              await onEditValue?.(indexPath);
              rerender?.();
            }}
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
              } ${identifierTag ? `block-identifier-${identifierTag}` : ""} ${
                data.type === "name-hole" && data.phantom ? "block-name-hole-phantom" : ""
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

            {data.type === "hlist" && expr && expr.kind === "List" ? (
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
            ) : isAndOr ? (
              <BlockPullTab
                id={`${id}-pull-tab`}
                indexPath={extendIndexPath(indexPath, expr.args.length)}
                isCopySource={isCopySource}
              />
            ) : isVariadicCall ? (
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

      case "string": {
        const { value } = data;

        return `"${value.replace(/["\\]/g, "\\$&")}"`;
      }

      case "name-binding": {
        const { id } = data;

        return (
          <>
            {id}

            {children}
          </>
        );
      }

      case "type-name-binding":
      case "type":
      case "type-var": {
        const { id } = data;

        const renderAsInfix = data.type === "type" && id === "Function";

        return (
          <>
            {!renderAsInfix && <div className="block-type-label">{id}</div>}

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
