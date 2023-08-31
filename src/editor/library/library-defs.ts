import { keyBy } from "lodash";
import { ProgSymbol } from "../symbol-table";
import { Expr, SExpr } from "../../typechecker/ast/ast";
import { hole } from "../ast/ast";

const revTail: ProgSymbol = {
  id: "rev-tail",

  argTypes: [
    { tag: "List", element: { var: "Element" } },
    { tag: "List", element: { var: "Element" } },
  ],
  retType: { tag: "List", element: { var: "Element" } },
  minArgCount: 2,
  maxArgCount: 2,
  bodyArgHints: ["l", "acc"],
};

// https://inst.eecs.berkeley.edu/~cs61a/sp19/articles/scheme-builtins.html#pair-and-list-manipulation
// Extracted with ChatGPT, thx lol
export const symbols = keyBy(
  [
    revTail,
    {
      id: "define",
      doc: "Defines a variable",

      minArgCount: 2,
      maxArgCount: 2,
      headingArgCount: 1,
    },
    {
      id: "lambda",
      doc: "Creates a function",

      minArgCount: 2,
      maxArgCount: 2,
      headingArgCount: 1,
    },
    {
      id: "if",
      doc: "Conditional",

      minArgCount: 3,
      headingArgCount: 1,
      bodyArgHints: ["then", "else"],
    },

    {
      id: "text",
      doc: "New text object",

      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "rotate",
      doc: "Rotate object",

      minArgCount: 2,
      maxArgCount: 2,
      bodyArgHints: ["degrees", "object"],
    },

    // {
    //   id: "atom?",
    //   doc: "Returns true if arg is a boolean, number, symbol, string, or nil; false otherwise.",
    // },
    // {
    //   id: "boolean?",
    //   doc: "Returns true if arg is a boolean; false otherwise.",
    // },
    // {
    //   id: "integer?",
    //   doc: "Returns true if arg is a integer; false otherwise.",
    // },
    // {
    //   id: "null?",
    //   doc: "Returns true if arg is nil (the empty list); false otherwise.",
    // },
    // {
    //   id: "append",
    // },
    // {
    //   id: "list",
    // },
    // {
    //   id: "car",
    //   doc: "Head (first element) of the given list",
    // },
    // {
    //   id: "cdr",
    //   doc: "Tail (all except first element) of the given list",
    // },

    {
      id: "apply",
      doc: "Calls procedure with the given list of args.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [
        { tag: "Function", in: { tag: "Any" }, out: { var: "Out" } },
        { tag: "List", element: { tag: "Any" } },
      ],
      retType: { var: "Out" },
    },
    {
      id: "error",
      doc: "Raises a SchemeError with msg as its message. If there is no msg, the error's message will be empty.",
      maxArgCount: 1,
      argTypes: [{ tag: "String" }],
      retType: { tag: "Never" },
    },
    {
      id: "eval",
      doc: "Evaluates expression in the current environment.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "String" }],
      retType: { tag: "Any" },
    },
    {
      id: "atom?",
      doc: "Returns true if arg is a boolean, number, symbol, string, or nil;",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "boolean?",
      doc: "Returns true if arg is a boolean; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "integer?",
      doc: "Returns true if arg is a integer; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "list?",
      doc: "Returns true if arg is a well-formed list (i.e., it doesn't contain",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "number?",
      doc: "Returns true if arg is a number; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "null?",
      doc: "Returns true if arg is nil (the empty list); false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "pair?",
      doc: "Returns true if arg is a pair; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "procedure?",
      doc: "Returns true if arg is a procedure; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "string?",
      doc: "Returns true if arg is a string; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "symbol?",
      doc: "Returns true if arg is a symbol; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ var: "Arg" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "append",
      doc: "Returns the result of appending the items of all lsts in order into a single",
      argTypes: [
        { tag: "List", element: { var: "Element" } },
        { tag: "List", element: { var: "Element" } },
      ],
      retType: { tag: "List", element: { var: "Element" } },
    },
    {
      id: "car",
      doc: "Returns the car of pair. Errors if pair is not a pair.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Pair", car: { var: "Car" }, cdr: { var: "Cdr" } }],
      retType: { var: "Car" },
    },
    {
      id: "cdr",
      doc: "Returns the cdr of pair. Errors if pair is not a pair.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Pair", car: { var: "Car" }, cdr: { var: "Cdr" } }],
      retType: { var: "Cdr" },
    },
    {
      id: "cons",
      doc: "Returns a new pair with first as the car and rest as the cdr",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ var: "Car" }, { var: "Cdr" }],
      retType: { tag: "Pair", car: { var: "Car" }, cdr: { var: "Cdr" } },
    },
    {
      id: "length",
      doc: "Returns the length of arg. If arg is not a list, this",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "List", element: { var: "Element" } }],
      retType: { tag: "Integer" },
    },
    {
      id: "list",
      doc: "Returns a list with the items in order as its elements.",
      minArgCount: 1,
      argTypes: [{ var: "Element" }],
      retType: { tag: "List", element: { var: "Element" } },
    },
    {
      id: "map",
      doc: "Returns a list constructed by calling proc (a one-argument",
      minArgCount: 1,
      argTypes: [
        { tag: "Function", in: { var: "Element" }, out: { var: "NewElement" } },
        { tag: "List", element: { var: "Element" } },
      ],
      retType: { tag: "List", element: { var: "NewElement" } },
    },
    {
      id: "filter",
      doc: "Returns a list consisting of only the elements of lst that",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "List", element: { var: "Element" } }],
      retType: { tag: "List", element: { var: "Element" } },
    },
    {
      id: "reduce",
      doc: "Returns the result of sequentially combining each element in lst",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "+",
      doc: "Returns the sum of all nums. Returns 0 if there are none. If any num is not",
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Number" },
    },
    {
      id: "-",
      doc: "If there is only one num, return its negation. Otherwise, return the first",
      minArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
    },
    {
      id: "*",
      doc: "Returns the product of all nums. Returns 1 if there are none. If any num is",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
    },
    {
      id: "/",
      doc: "If there are no divisors, return 1 divided by dividend. Otherwise, return",
      minArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
    },
    {
      id: "abs",
      doc: "Returns the absolute value of num, which must be a number.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
    },
    {
      id: "expt",
      doc: "Returns the base raised to the power power. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Number" },
    },
    {
      id: "modulo",
      doc: "Returns a modulo b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Integer" },
    },
    {
      id: "quotient",
      doc: "Returns dividend integer divided by divisor. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Integer" },
    },
    {
      id: "remainder",
      doc: "Returns the remainder that results when dividend is integer divided by divisor. Both must be numbers. Differs from modulo in behavior when negative numbers are involved.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Integer" },
    },
    {
      id: "eq?",
      doc: "If a and b are both numbers, booleans, symbols, or strings, return true if",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Any" }, { tag: "Any" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "equal?",
      doc: "Returns true if a and b are equivalent. For two pairs, they are equivalent",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Any" }, { tag: "Any" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "not",
      doc: "Returns true if arg is false-y or false if arg is truthy.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Any" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "=",
      doc: "Returns true if a equals b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "<",
      doc: "Returns true if a is less than b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Boolean" },
    },
    {
      id: ">",
      doc: "Returns true if a is greater than b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "<=",
      doc: "Returns true if a is less than or equal to b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Boolean" },
    },
    {
      id: ">=",
      doc: "Returns true if a is greater than or equal to b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Number" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "even?",
      doc: "Returns true if num is even. num must be a number.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "odd?",
      doc: "Returns true if num is odd. num must be a number.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Boolean" },
    },
    {
      id: "zero?",
      doc: "Returns true if num is zero. num must be a number.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Boolean" },
    },
  ] satisfies ProgSymbol[],
  ({ id }) => id
);

export const library: Expr[] = [
  { kind: "bool", value: true },
  { kind: "bool", value: false },
  // TODO: Enable once supported
  // { kind: "null" },
  { kind: "number", value: 0 },

  { kind: "define", name: hole, value: hole },
  { kind: "lambda", params: [], body: { kind: "sequence", exprs: [hole] } },
  { kind: "lambda", params: [hole], body: { kind: "sequence", exprs: [hole] } },
  { kind: "if", if: hole, then: hole, else: hole },

  ...Object.values(symbols).map(
    (symbol): SExpr => ({ kind: "sexpr", called: { kind: "var", id: symbol.id }, args: [] })
  ),
];
