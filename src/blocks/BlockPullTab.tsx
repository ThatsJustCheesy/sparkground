import { UniqueIdentifier, useDroppable } from "@dnd-kit/core";
import { PropsWithChildren } from "react";
import { TreeIndexPath } from "../ast/ast";

type Props = PropsWithChildren<{
  id: UniqueIdentifier;
  indexPath: TreeIndexPath;

  isCopySource?: boolean;
}>;

export default function BlockPullTab({ id, indexPath, isCopySource }: Props) {
  // Drop area, if applicable
  let { isOver, setNodeRef } = useDroppable({
    id,
    data: { indexPath },
  });
  if (isCopySource) {
    // Not a drop area
    isOver = false;
    setNodeRef = () => {};
  }

  return (
    <div className="block-h-pull-tab-container">
      <div
        ref={setNodeRef}
        className={`block-h-pull-tab block-h-pull-tab-shown ${isOver ? "block-dragged-over" : ""}`}
        style={{ zIndex: indexPath.tree.zIndex - 1 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 96 960 960" height="8" width="8">
          <path d="M480.138 1001q-88.138 0-165.625-33.084-77.488-33.083-135.417-91.012T88.084 741.625Q55 664.276 55 576.138 55 487 88.084 409.513q33.083-77.488 90.855-134.969 57.772-57.482 135.195-91.013Q391.557 150 479.779 150q89.221 0 166.827 33.454 77.605 33.453 135.012 90.802 57.407 57.349 90.895 134.877Q906 486.66 906 576q0 88.276-33.531 165.747-33.531 77.471-91.013 135.278-57.481 57.808-134.831 90.891Q569.276 1001 480.138 1001ZM480 907q138 0 234.5-96.372T811 576q0-138-96.5-234.5t-235-96.5q-137.5 0-234 96.5t-96.5 235q0 137.5 96.372 234T480 907Zm0-331Z" />
        </svg>
      </div>
    </div>
  );
}
