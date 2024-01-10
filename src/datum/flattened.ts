// Syntactically flattened Datum type
// For expression parsing

import { BoolDatum, Datum, ListDatum, NumberDatum, StringDatum, SymbolDatum } from "./datum";

export type FlattenedDatum =
  | BoolDatum
  | NumberDatum
  | StringDatum
  | SymbolDatum
  | FlattenedListDatum
  | QuotedDatum;

export type FlattenedListDatum = {
  kind: "list";
  heads: FlattenedDatum[];
};
export type QuotedDatum = {
  kind: "quote";
  value: Datum;
};

export function flattenDatum(datum: Datum): FlattenedDatum {
  return datum.kind === "list" ? flattenListOrQuotedDatum(datum) : datum;
}

export function flattenListOrQuotedDatum(list: ListDatum): FlattenedListDatum | QuotedDatum {
  if (list.heads[0]?.kind === "symbol" && list.heads[0]?.value === "quote") {
    if (list.heads.length !== 2) {
      throw "'quote' requires exactly one datum";
    }

    return {
      kind: "quote",
      value: list.heads[1]!,
    };
  }

  return flattenListDatum(list);
}

export function flattenListDatum(list: ListDatum): FlattenedListDatum {
  const heads = list.heads.map(flattenDatum);

  if (!list.tail) {
    return {
      kind: "list",
      heads,
    };
  }

  if (list.tail.kind !== "list") {
    throw "non-list expressions cannot appear after '.' in this context";
  }

  return {
    kind: "list",
    heads: [...heads, ...flattenListDatum(list.tail).heads],
  };
}
