// https://conservatory.scheme.org/schemers/Documents/Standards/R5RS/HTML/r5rs-Z-H-10.html#%_sec_7.1.2

export type Datum = BoolDatum | NumberDatum | StringDatum | SymbolDatum | ListDatum;

export type BoolDatum = {
  kind: "bool";
  value: boolean;
};
export type NumberDatum = {
  kind: "number";
  value: number;
};
export type StringDatum = {
  kind: "string";
  value: string;
};

export type SymbolDatum = {
  kind: "symbol";
  value: string;
};

export type ListDatum = {
  kind: "list";
  heads: Datum[];
  tail?: Datum;
};
