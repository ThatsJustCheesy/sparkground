import "./library.css";
import { useDroppable } from "@dnd-kit/core";
import LibraryBlocks from "./LibraryBlocks";

type Props = {};

export default function Library({}: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: "library",
    data: { isLibrary: true },
  });

  return (
    <div ref={setNodeRef} className="library-container">
      <div className="library">
        <h2 className="library-heading">Library</h2>
        <LibraryBlocks />
      </div>
    </div>
  );
}
