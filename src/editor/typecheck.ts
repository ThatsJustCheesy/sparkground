import { ProgSymbol } from "./symbol-table";
import { TypeEnv } from "../typechecker/infer";
import { mapValues } from "lodash";
import { Type } from "../typechecker/type";

export function symbolsAsTypeEnv(symbols: Record<string, ProgSymbol>): TypeEnv {
  return mapValues(symbols, symbolAsType);
}
export function symbolAsType(symbol: ProgSymbol): Type {
  return (
    // NOTE: Left fold, not right, since we want to *reverse* the order in which arguments are given!
    //       i.e., the definition specifies order [arg0, arg1, ..., argN],
    //             but on application, arguments are supplied in reverse order: [argN, arg(N-1), ..., arg0]
    symbol.argTypes?.reduce(
      (retType, argType) => ({ tag: "Function", in: argType, out: retType }),
      symbol.retType!
    ) ?? { tag: "Any" } // FIXME: Don't give "Any" as a fallback
  );
}
