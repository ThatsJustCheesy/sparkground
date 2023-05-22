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
  "null?": {
    id: "null?",
    doc: "Whether the argument is an empty list",
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
