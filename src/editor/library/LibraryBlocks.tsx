import "./library.css";
import { render } from "../ast/render";
import { library } from "./library-defs";
import { SymbolTable } from "../symbol-table";
import { TypeInferrer } from "../../typechecker/infer";

type Props = {};

export default function LibraryBlocks({}: Props) {
  return (
    <>
      {library.map((symbol, index) =>
        render(
          {
            id: `library-${index}`,
            root: symbol,
            location: { x: 0, y: 0 },
            zIndex: 1,
            inferrer: new TypeInferrer(),
          },
          symbol,
          new SymbolTable(),
          { isCopySource: true }
        )
      )}
    </>
  );
}
