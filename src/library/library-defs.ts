import { keyBy } from "lodash";
import { Expr, hole, s } from "../ast/ast";
import { ProgSymbol } from "../symbol-table";

// https://inst.eecs.berkeley.edu/~cs61a/sp19/articles/scheme-builtins.html#pair-and-list-manipulation
// Extracted with ChatGPT, thx lol
export const symbols = keyBy(
  [
    {
      id: "define",
      doc: "Variable or function definition",

      minArgCount: 2,
      headingArgCount: 1,

      special: "define",
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
    },
    {
      id: "display",
      doc: "Prints val. If val is a Scheme string, it will be output without quotes.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "error",
      doc: "Raises a SchemeError with msg as its message. If there is no msg, the error's message will be empty.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "eval",
      doc: "Evaluates expression in the current environment.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "newline",
      doc: "Prints a new line.",
      maxArgCount: 0,
    },
    {
      id: "print",
      doc: "Prints the Scheme representation of val. Unlike display, this will include",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "atom?",
      doc: "Returns true if arg is a boolean, number, symbol, string, or nil;",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "boolean?",
      doc: "Returns true if arg is a boolean; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "integer?",
      doc: "Returns true if arg is a integer; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "list?",
      doc: "Returns true if arg is a well-formed list (i.e., it doesn't contain",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "number?",
      doc: "Returns true if arg is a number; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "null?",
      doc: "Returns true if arg is nil (the empty list); false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "pair?",
      doc: "Returns true if arg is a pair; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "procedure?",
      doc: "Returns true if arg is a procedure; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "string?",
      doc: "Returns true if arg is a string; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "symbol?",
      doc: "Returns true if arg is a symbol; false otherwise.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "append",
      doc: "Returns the result of appending the items of all lsts in order into a single",
    },
    {
      id: "car",
      doc: "Returns the car of pair. Errors if pair is not a pair.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "cdr",
      doc: "Returns the cdr of pair. Errors if pair is not a pair.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "cons",
      doc: "Returns a new pair with first as the car and rest as the cdr",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "length",
      doc: "Returns the length of arg. If arg is not a list, this",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "list",
      doc: "Returns a list with the items in order as its elements.",
      minArgCount: 1,
    },
    {
      id: "map",
      doc: "Returns a list constructed by calling proc (a one-argument",
      minArgCount: 1,
    },
    {
      id: "filter",
      doc: "Returns a list consisting of only the elements of lst that",
      minArgCount: 2,
      maxArgCount: 2,
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
    },
    {
      id: "-",
      doc: "If there is only one num, return its negation. Otherwise, return the first",
      minArgCount: 1,
    },
    {
      id: "*",
      doc: "Returns the product of all nums. Returns 1 if there are none. If any num is",
    },
    {
      id: "/",
      doc: "If there are no divisors, return 1 divided by dividend. Otherwise, return",
      minArgCount: 1,
    },
    {
      id: "abs",
      doc: "Returns the absolute value of num, which must be a number.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "expt",
      doc: "Returns the base raised to the power power. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "modulo",
      doc: "Returns a modulo b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "quotient",
      doc: "Returns dividend integer divided by divisor. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "remainder",
      doc: "Returns the remainder that results when dividend is integer divided by divisor. Both must be numbers. Differs from modulo in behavior when negative numbers are involved.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "eq?",
      doc: "If a and b are both numbers, booleans, symbols, or strings, return true if",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "equal?",
      doc: "Returns true if a and b are equivalent. For two pairs, they are equivalent",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "not",
      doc: "Returns true if arg is false-y or false if arg is truthy.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "=",
      doc: "Returns true if a equals b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "<",
      doc: "Returns true if a is less than b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: ">",
      doc: "Returns true if a is greater than b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "<=",
      doc: "Returns true if a is less than or equal to b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: ">=",
      doc: "Returns true if a is greater than or equal to b. Both must be numbers.",
      minArgCount: 2,
      maxArgCount: 2,
    },
    {
      id: "even?",
      doc: "Returns true if num is even. num must be a number.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "odd?",
      doc: "Returns true if num is odd. num must be a number.",
      minArgCount: 1,
      maxArgCount: 1,
    },
    {
      id: "zero?",
      doc: "Returns true if num is zero. num must be a number.",
      minArgCount: 1,
      maxArgCount: 1,
    },
  ] satisfies ProgSymbol[],
  ({ id }) => id
);

export const library: Expr[] = [
  true,
  false,
  // TODO: Enable once supported
  // null,
  { n: 0 },

  ...Object.values(symbols).map((symbol) => s(symbol)),
];
