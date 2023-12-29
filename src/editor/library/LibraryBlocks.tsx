import "./library.css";
import { Renderer } from "../trees/render";
import { library } from "./library-defs";
import { SymbolTable } from "../symbol-table";
import { TypeInferrer } from "../../typechecker/infer";
import { Tree } from "../trees/trees";

type Props = {};

export default function LibraryBlocks({}: Props) {
  return (
    <>
      {library.map((symbol, index) => {
        const tree: Tree = {
          id: `library-${index}`,
          root: symbol,
          location: { x: 0, y: 0 },
          zIndex: 1,
          inferrer: new TypeInferrer(),
        };

        return new Renderer(tree, new SymbolTable(), tree.inferrer, {}).render(symbol, {
          isCopySource: true,
        });
      })}
    </>
  );
}
