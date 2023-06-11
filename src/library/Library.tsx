import "./library.css";
import { useDroppable } from "@dnd-kit/core";
import { ProgSymbol } from "../symbol-table";
import LibraryBlocks from "./LibraryBlocks";

type Props = {
  contextHelpSubject?: ProgSymbol | number | boolean;
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
            typeof contextHelpSubject === "number" ? (
              <>
                <h3 className="library-subheading">{"number"}</h3>
                <p className="library-context-help-text">{"right-click to change value"}</p>
              </>
            ) : typeof contextHelpSubject === "boolean" ? (
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
        <LibraryBlocks />
      </div>
    </div>
  );
}
