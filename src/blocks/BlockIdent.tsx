import { ProgSymbol } from "../symbol-table";
import { UniqueIdentifier, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { callEach } from "../util";
import { TreeIndexPath } from "../ast/ast";

type Props = {
  id: UniqueIdentifier;
  indexPath: TreeIndexPath;

  symbol: ProgSymbol;
  definesSymbol?: boolean;
  isCopySource?: boolean;

  onSymbolMouseEnter?: (symbol: ProgSymbol) => void;
  onSymbolMouseLeave?: (symbol: ProgSymbol) => void;
};

export default function BlockIdent({
  id,
  indexPath,

  symbol,
  definesSymbol,
  isCopySource,

  onSymbolMouseEnter,
  onSymbolMouseLeave,
}: Props) {
  const { isOver, setNodeRef: setNodeRef1 } = definesSymbol
    ? { isOver: false, setNodeRef: () => {} }
    : useDroppable({
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
    data: { indexPath, copyOnDrop: definesSymbol || isCopySource },
  });

  return (
    <div
      ref={callEach(setNodeRef1, setNodeRef2)}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={`${definesSymbol ? "block-ident-def" : "block-ident"} ${
        isOver ? "block-dragged-over" : ""
      }`}
      onMouseEnter={() => onSymbolMouseEnter?.(symbol)}
      onMouseLeave={() => onSymbolMouseLeave?.(symbol)}
    >
      {symbol.id}
    </div>
  );
}
