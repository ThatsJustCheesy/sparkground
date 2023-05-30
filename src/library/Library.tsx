import "./library.css";
import { renderExpr } from "../ast/render";
import { library } from "./library-defs";
import { useDroppable } from "@dnd-kit/core";
import { ProgSymbol } from "../symbol-table";

type Props = {
  contextHelpSubject?: ProgSymbol | boolean;
};

export default function Library({ contextHelpSubject }: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: "library",
    data: { isLibrary: true },
  });

  return (
    <div ref={setNodeRef} className="library-container">
      <div className="library">
        <h2 className="library-heading">Help</h2>
        <div className="library-context-help">
          {contextHelpSubject !== undefined ? (
            typeof contextHelpSubject === "boolean" ? (
              <h3 className="library-subheading">
                {contextHelpSubject ? "true (boolean)" : "false (boolean)"}
              </h3>
            ) : (
              <>
                <h3 className="library-subheading">{contextHelpSubject.id}</h3>
                <p className="library-context-help-text">{contextHelpSubject.doc}</p>
              </>
            )
          ) : (
            <span style={{ color: "#444" }}>No selection</span>
          )}
        </div>

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
