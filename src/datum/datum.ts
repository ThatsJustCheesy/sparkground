// https://conservatory.scheme.org/schemers/Documents/Standards/R5RS/HTML/r5rs-Z-H-10.html#%_sec_7.1.2

export type Datum = BoolDatum | NumberDatum | StringDatum | SymbolDatum | ListDatum;

export type BoolDatum = {
  kind: "Boolean";
  value: boolean;
};
export type NumberDatum = {
  kind: "Number";
  value: number;
};
export type StringDatum = {
  kind: "String";
  value: string;
};

export type SymbolDatum = {
  kind: "Symbol";
  value: string;
};

export type ListDatum = {
  kind: "List";
  heads: Datum[];
  tail?: Datum;
};
