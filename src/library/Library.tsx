import "./library.css";
import { renderExpr } from "../ast/render";
import { library } from "./library-defs";
import { useDroppable } from "@dnd-kit/core";

type Props = {};

export default function Library({}: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: "library",
    data: { isLibrary: true },
  });

  return (
    <div ref={setNodeRef} className="library-container">
      <hr className="divider" />
      <div className="library">
        <h2 className="library-heading">Library</h2>
        {library.map((symbol, index) =>
          renderExpr(
            {
              id: `library-${index}`,
              root: symbol,
              location: { x: 0, y: 0 },
              zIndex: 1,
            },
            symbol,
            { isCopySource: true }
          )
        )}
      </div>
    </div>
  );
}
