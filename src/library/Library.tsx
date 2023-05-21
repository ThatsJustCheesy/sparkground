import { renderExpr } from "../ast/render";
import { library } from "./library-defs";

type Props = {};

export default function Library({}: Props) {
  return (
    <div className="library-container">
      <hr className="divider" />
      <div className="library">
        <h2 className="library-heading">Library</h2>
        {library.map((symbol, index) =>
          renderExpr(
            {
              id: `library-${index}`,
              root: symbol,
            },
            symbol,
            { isCopySource: true }
          )
        )}
      </div>
    </div>
  );
}
