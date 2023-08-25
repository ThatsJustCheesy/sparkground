import "./library.css";
import { renderExpr } from "../ast/render";
import { library } from "./library-defs";

type Props = {};

export default function LibraryBlocks({}: Props) {
  return (
    <>
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
    </>
  );
}
