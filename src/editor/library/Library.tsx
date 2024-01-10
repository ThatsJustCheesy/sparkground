import "./library.css";
import { useDroppable } from "@dnd-kit/core";
import LibraryBlocks from "./LibraryBlocks";
import { memo } from "react";

const LibraryBlocksMemo = memo(LibraryBlocks);

export default function Library() {
  const { isOver, setNodeRef } = useDroppable({
    id: "library",
    data: { isLibrary: true },
  });

  return (
    <div ref={setNodeRef} className="library-container">
      <div className="library">
        {/* <h2 className="library-heading">Library</h2> */}
        <LibraryBlocksMemo />
      </div>
    </div>
  );
}
