import { UniqueIdentifier, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { callEach } from "../util";
import { TreeIndexPath } from "../ast/ast";

type Props = {
  id: UniqueIdentifier;
  indexPath: TreeIndexPath;

  value: boolean;
  isCopySource?: boolean;
};

export default function BlockBool({
  id,
  indexPath,

  value,
  isCopySource,
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
      className={`${"block-bool"} ${isOver ? "block-dragged-over" : ""}`}
    >
      {value ? "true" : "false"}
    </div>
  );
}
