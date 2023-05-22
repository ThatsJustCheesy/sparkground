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
  heading?: JSX.Element;
  isCopySource?: boolean;

  onSymbolMouseEnter?: (symbol: ProgSymbol) => void;
  onSymbolMouseLeave?: (symbol: ProgSymbol) => void;
}>;

export default function BlockV({
  id,
  indexPath,

  symbol,
  heading,
  isCopySource,
  children,

  onSymbolMouseEnter,
  onSymbolMouseLeave,
}: Props) {
  const { isOver, setNodeRef: setNodeRef1 } = useDroppable({
    id,
    data: { indexPath },
  });
  const {
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
      className={`block-v ${isOver ? "block-dragged-over" : ""}`}
    >
      <div className="block-v-heading">
        <div
          className="block-v-label"
          onMouseEnter={() => onSymbolMouseEnter?.(symbol)}
          onMouseLeave={() => onSymbolMouseLeave?.(symbol)}
        >
          {symbol.id}
        </div>
        {heading}
      </div>
      {children}
    </div>
  );
}
