import { PropsWithChildren } from "react";
import { ProgSymbol } from "../symbol-table";
import { UniqueIdentifier, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { callEach } from "../util";
import { TreeIndexPath } from "../ast/ast";

type Props = PropsWithChildren<{
  id: UniqueIdentifier;
  indexPath: TreeIndexPath;

  symbol: ProgSymbol;
  definesSymbol?: boolean;
  isCopySource?: boolean;

  onSymbolMouseEnter?: (symbol: ProgSymbol) => void;
  onSymbolMouseLeave?: (symbol: ProgSymbol) => void;
}>;

export default function BlockH({
  id,
  indexPath,

  symbol,
  definesSymbol,
  isCopySource,
  children,

  onSymbolMouseEnter,
  onSymbolMouseLeave,
}: Props) {
  const { isOver, setNodeRef: setNodeRef1 } =
    isCopySource || indexPath.path.length === 0
      ? { isOver: false, setNodeRef: () => {} }
      : useDroppable({
          id,
          data: { indexPath },
        });
  const {
    active,
    over,
    attributes,
    listeners,
    setNodeRef: setNodeRef2,
    transform,
  } = useDraggable({
    id,
    data: { indexPath, copyOnDrop: isCopySource },
  });

  return (
    <div
      ref={callEach(setNodeRef1, setNodeRef2)}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={`block-h ${
        active?.id === id ? "block-dragging" : isOver ? "block-dragged-over" : ""
      } ${active?.id === id && over?.id === "library" ? "block-drop-will-delete" : ""}`}
    >
      <div
        className={["block-h-label", definesSymbol ? "block-ident-def" : ""].join(" ")}
        onMouseEnter={() => onSymbolMouseEnter?.(symbol)}
        onMouseLeave={() => onSymbolMouseLeave?.(symbol)}
      >
        {symbol.id}
      </div>
      {children}
    </div>
  );
}
