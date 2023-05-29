import { Expr, hole, s } from "../ast/ast";
import { ProgSymbol } from "../symbol-table";

export const symbols = {
  define: {
    id: "define",
    doc: "Variable or function definition",

    headingArgCount: 1,

    special: "define",
  },
  if: {
    id: "if",
    doc: "Conditional",

    headingArgCount: 1,
    bodyArgHints: ["then", "else"],
  },
  "atom?": {
    id: "atom?",
    doc: "Returns true if arg is a boolean, number, symbol, string, or nil; false otherwise.",
  },
  "boolean?": {
    id: "boolean?",
    doc: "Returns true if arg is a boolean; false otherwise.",
  },
  "integer?": {
    id: "integer?",
    doc: "Returns true if arg is a integer; false otherwise.",
  },
  "null?": {
    id: "null?",
    doc: "Returns true if arg is nil (the empty list); false otherwise.",
  },
  append: {
    id: "append",
  },
  list: {
    id: "list",
  },
  car: {
    id: "car",
    doc: "Head (first element) of the given list",
  },
  cdr: {
    id: "cdr",
    doc: "Tail (all except first element) of the given list",
  },
} satisfies Record<string, ProgSymbol>;

const _ = symbols;

// TODO: Hack
const emptyIdentifier: ProgSymbol = {
  id: "…",
  headingArgCount: 1,
};

export const library: Expr[] = [
  s(_.define, hole),
  s(_.if, hole, hole, hole),
  s(_["atom?"], hole),
  s(_["boolean?"], hole),
  s(_["integer?"], hole),
  s(_["null?"], hole),
  s(_.append, hole, hole),
  s(_.list, hole),
  s(_.car, hole),
  s(_.cdr, hole),
  true,
  false,
  // TODO: Enable once supported
  // null,
];
