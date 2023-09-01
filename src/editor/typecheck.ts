import { ProgSymbol } from "./symbol-table";
import { TypeEnv } from "../typechecker/infer";
import { mapValues } from "lodash";
import { Type } from "../typechecker/type";

export function symbolsAsTypeEnv(symbols: Record<string, ProgSymbol>): TypeEnv {
  return mapValues(symbols, symbolAsType);
}
export function symbolAsType(symbol: ProgSymbol): Type {
  return (
    symbol.argTypes?.reduceRight(
      (retType, argType) => ({ tag: "Function", in: argType, out: retType }),
      symbol.retType!
    ) ?? { tag: "Any" } // FIXME: Don't give "Any" as a fallback
  );
}
