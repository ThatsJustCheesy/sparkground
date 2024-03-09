import { Expr } from "../../expr/expr";
import { hole } from "../trees/tree";

export type LibraryCategory = {
  name: string;
  entries?: Expr[];
  subcategories?: LibraryCategory[];
};

export const LibraryCategories: LibraryCategory[] = [
  {
    name: "Define",
    entries: [
      { kind: "define", name: hole, value: hole },
      { kind: "lambda", params: [], body: { kind: "sequence", exprs: [hole] } },
      { kind: "lambda", params: [hole], body: { kind: "sequence", exprs: [hole] } },
      { kind: "let", bindings: [[hole, hole]], body: hole },
      { kind: "letrec", bindings: [[hole, hole]], body: hole },
      { kind: "Symbol", value: "symbol" },
    ],
  },
  {
    name: "Apply",
    entries: [
      { kind: "call", called: hole, args: [] },
      { kind: "call", called: { kind: "var", id: "apply" }, args: [] },
      { kind: "call", called: { kind: "var", id: "map" }, args: [] },
      { kind: "call", called: { kind: "var", id: "for-each" }, args: [] },
      { kind: "call", called: { kind: "var", id: "force" }, args: [] },
      { kind: "call", called: { kind: "var", id: "call-with-current-continuation" }, args: [] },
      // { kind: "call", called: { kind: "var", id: "values" }, args: [] },
      // { kind: "call", called: { kind: "var", id: "call-with-values" }, args: [] },
      { kind: "call", called: { kind: "var", id: "eval" }, args: [] },
    ],
  },
  {
    name: "Logic",
    entries: [
      { kind: "Boolean", value: true },
      { kind: "Boolean", value: false },
      { kind: "if", if: hole, then: hole, else: hole },
      { kind: "call", called: { kind: "var", id: "and" }, args: [] },
      { kind: "call", called: { kind: "var", id: "or" }, args: [] },
      { kind: "call", called: { kind: "var", id: "not" }, args: [] },
    ],
  },
  {
    name: "Numeric",
    subcategories: [
      {
        name: "Arithmetic",
        entries: [
          { kind: "Number", value: 0 },
          { kind: "call", called: { kind: "var", id: "+" }, args: [] },
          { kind: "call", called: { kind: "var", id: "-" }, args: [] },
          { kind: "call", called: { kind: "var", id: "*" }, args: [] },
          { kind: "call", called: { kind: "var", id: "/" }, args: [] },
        ],
      },
      {
        name: "Integers",
        entries: [
          { kind: "call", called: { kind: "var", id: "quotient" }, args: [] },
          { kind: "call", called: { kind: "var", id: "remainder" }, args: [] },
          { kind: "call", called: { kind: "var", id: "modulo" }, args: [] },
          { kind: "call", called: { kind: "var", id: "gcd" }, args: [] },
          { kind: "call", called: { kind: "var", id: "lcm" }, args: [] },
        ],
      },
      {
        name: "Reals",
        entries: [
          { kind: "call", called: { kind: "var", id: "abs" }, args: [] },
          { kind: "call", called: { kind: "var", id: "floor" }, args: [] },
          { kind: "call", called: { kind: "var", id: "ceiling" }, args: [] },
          { kind: "call", called: { kind: "var", id: "truncate" }, args: [] },
          { kind: "call", called: { kind: "var", id: "round" }, args: [] },
          { kind: "call", called: { kind: "var", id: "exp" }, args: [] },
          { kind: "call", called: { kind: "var", id: "log" }, args: [] },
          { kind: "call", called: { kind: "var", id: "^" }, args: [] },
          { kind: "call", called: { kind: "var", id: "sin" }, args: [] },
          { kind: "call", called: { kind: "var", id: "cos" }, args: [] },
          { kind: "call", called: { kind: "var", id: "tan" }, args: [] },
          { kind: "call", called: { kind: "var", id: "asin" }, args: [] },
          { kind: "call", called: { kind: "var", id: "acos" }, args: [] },
          { kind: "call", called: { kind: "var", id: "atan" }, args: [] },
          { kind: "call", called: { kind: "var", id: "sqrt" }, args: [] },
        ],
      },
      {
        name: "Compare",
        entries: [
          { kind: "call", called: { kind: "var", id: "=" }, args: [] },
          { kind: "call", called: { kind: "var", id: "<" }, args: [] },
          { kind: "call", called: { kind: "var", id: ">" }, args: [] },
          { kind: "call", called: { kind: "var", id: "<=" }, args: [] },
          { kind: "call", called: { kind: "var", id: ">=" }, args: [] },
          { kind: "call", called: { kind: "var", id: "zero?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "positive?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "negative?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "integer?" }, args: [] },
        ],
      },
    ],
  },
  {
    name: "Lists",
    subcategories: [
      {
        name: "Construct",
        entries: [
          { kind: "List", heads: [] },
          { kind: "call", called: { kind: "var", id: "cons" }, args: [] },
          { kind: "call", called: { kind: "var", id: "list" }, args: [] },
          { kind: "call", called: { kind: "var", id: "append" }, args: [] },
          { kind: "call", called: { kind: "var", id: "reverse" }, args: [] },
        ],
      },
      {
        name: "Deconstruct",
        entries: [
          { kind: "call", called: { kind: "var", id: "empty?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "pair?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "first" }, args: [] },
          { kind: "call", called: { kind: "var", id: "rest" }, args: [] },
          { kind: "call", called: { kind: "var", id: "length" }, args: [] },
          { kind: "call", called: { kind: "var", id: "list-tail" }, args: [] },
          { kind: "call", called: { kind: "var", id: "memq" }, args: [] },
          { kind: "call", called: { kind: "var", id: "memv" }, args: [] },
          { kind: "call", called: { kind: "var", id: "member" }, args: [] },
          { kind: "call", called: { kind: "var", id: "assq" }, args: [] },
          { kind: "call", called: { kind: "var", id: "assv" }, args: [] },
          { kind: "call", called: { kind: "var", id: "assoc" }, args: [] },
        ],
      },
      // {
      //   name: "Mutuate",
      //   entries: [
      //     { kind: "call", called: { kind: "var", id: "set-car!" }, args: [] },
      //     { kind: "call", called: { kind: "var", id: "set-cdr!" }, args: [] },
      //   ],
      // },
    ],
  },
  {
    name: "Strings",
    subcategories: [
      {
        name: "Construct",
        entries: [
          { kind: "call", called: { kind: "var", id: "string" }, args: [] },
          { kind: "call", called: { kind: "var", id: "make-string" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string-append" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string-copy" }, args: [] },
        ],
      },
      {
        name: "Deconstruct",
        entries: [
          { kind: "call", called: { kind: "var", id: "string-length" }, args: [] },
          { kind: "call", called: { kind: "var", id: "substring" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string-ref" }, args: [] },
        ],
      },
      {
        name: "Mutate",
        entries: [
          { kind: "call", called: { kind: "var", id: "string-set!" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string-fill!" }, args: [] },
        ],
      },
      {
        name: "Compare",
        subcategories: [
          {
            name: "Exact",
            entries: [
              { kind: "call", called: { kind: "var", id: "string=?" }, args: [] },
              { kind: "call", called: { kind: "var", id: "string-<?" }, args: [] },
              { kind: "call", called: { kind: "var", id: "string->?" }, args: [] },
              { kind: "call", called: { kind: "var", id: "string-<=?" }, args: [] },
              { kind: "call", called: { kind: "var", id: "string->=?" }, args: [] },
            ],
          },
          {
            name: "Case-Insensitive",
            entries: [
              { kind: "call", called: { kind: "var", id: "string-ci=?" }, args: [] },
              { kind: "call", called: { kind: "var", id: "string-ci<?" }, args: [] },
              { kind: "call", called: { kind: "var", id: "string-ci>?" }, args: [] },
              { kind: "call", called: { kind: "var", id: "string-ci<=?" }, args: [] },
              { kind: "call", called: { kind: "var", id: "string-ci>=?" }, args: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Typing",
    subcategories: [
      {
        name: "Annotate",
        entries: [
          { kind: "type", type: { tag: "Boolean" } },
          { kind: "type", type: { tag: "Symbol" } },
          { kind: "type", type: { tag: "Number" } },
          { kind: "type", type: { tag: "Integer" } },
          { kind: "type", type: { tag: "String" } },
          { kind: "type", type: { tag: "List", of: [{ tag: "Any" }] } },
          { kind: "type", type: { tag: "Function", of: [{ tag: "Any" }] } },
          { kind: "type", type: { tag: "Function", of: [{ tag: "Any" }, { tag: "Any" }] } },
          {
            kind: "type",
            type: { tag: "Function", of: [{ tag: "Any" }, { tag: "Any" }, { tag: "Any" }] },
          },
          {
            kind: "type",
            type: {
              tag: "Function",
              of: [{ tag: "Any" }, { tag: "Any" }, { tag: "Any" }, { tag: "Any" }],
            },
          },
          {
            kind: "type",
            type: { forall: [{ kind: "type-name-hole" }], body: { tag: "Any" } },
          },
          { kind: "type", type: { tag: "Never" } },
        ],
      },
      {
        name: "Typecheck",
        entries: [
          { kind: "call", called: { kind: "var", id: "boolean?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "symbol?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "number?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "list?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "procedure?" }, args: [] },
        ],
      },
      {
        name: "Convert",
        entries: [
          { kind: "call", called: { kind: "var", id: "string->number" }, args: [] },
          { kind: "call", called: { kind: "var", id: "number->string" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string->symbol" }, args: [] },
          { kind: "call", called: { kind: "var", id: "symbol->string" }, args: [] },
        ],
      },
    ],
  },
];

// export const symbols = keyBy(
//   [
//     revTail,
//     {
//       id: "define",
//       doc: "Defines a variable",

//       minArgCount: 2,
//       maxArgCount: 2,
//       headingArgCount: 1,
//     },
//     {
//       id: "let",
//       doc: "Binds variables within a scope",

//       minArgCount: 2,
//       maxArgCount: 2,
//       headingArgCount: 1,
//     },
//     {
//       id: "lambda",
//       doc: "Creates a function",

//       minArgCount: 2,
//       maxArgCount: 2,
//       headingArgCount: 1,
//     },
//     {
//       id: "if",
//       doc: "Conditional",

//       minArgCount: 3,
//       headingArgCount: 1,
//       bodyArgHints: ["then", "else"],
//     },

//     {
//       id: "text",
//       doc: "New text object",

//       minArgCount: 1,
//       maxArgCount: 1,
//     },
//     {
//       id: "rotate",
//       doc: "Rotate object",

//       minArgCount: 2,
//       maxArgCount: 2,
//       bodyArgHints: ["degrees", "object"],
//     },

//     // {
//     //   id: "atom?",
//     //   doc: "Returns true if arg is a boolean, number, symbol, string, or nil; false otherwise.",
//     // },
//     // {
//     //   id: "boolean?",
//     //   doc: "Returns true if arg is a boolean; false otherwise.",
//     // },
//     // {
//     //   id: "integer?",
//     //   doc: "Returns true if arg is a integer; false otherwise.",
//     // },
//     // {
//     //   id: "null?",
//     //   doc: "Returns true if arg is nil (the empty list); false otherwise.",
//     // },
//     // {
//     //   id: "append",
//     // },
//     // {
//     //   id: "list",
//     // },
//     // {
//     //   id: "car",
//     //   doc: "Head (first element) of the given list",
//     // },
//     // {
//     //   id: "cdr",
//     //   doc: "Tail (all except first element) of the given list",
//     // },

//     {
//       id: "apply",
//     },
//     {
//       id: "error",
//       doc: "Raises a SchemeError with msg as its message. If there is no msg, the error's message will be empty.",
//       maxArgCount: 1,
//       argTypes: [{ tag: "String" }],
//       retType: { tag: "Never" },
//     },
//     {
//       id: "eval",
//       doc: "Evaluates expression in the current environment.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ tag: "String" }],
//       retType: { tag: "Any" },
//     },
//     {
//       id: "atom?",
//       doc: "Returns true if arg is a boolean, number, symbol, string, or nil;",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "boolean?",
//       doc: "Returns true if arg is a boolean; false otherwise.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "integer?",
//       doc: "Returns true if arg is a integer; false otherwise.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "list?",
//       doc: "Returns true if arg is a well-formed list (i.e., it doesn't contain",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "number?",
//       doc: "Returns true if arg is a number; false otherwise.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "null?",
//       doc: "Returns true if arg is nil (the empty list); false otherwise.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "pair?",
//       doc: "Returns true if arg is a pair; false otherwise.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "procedure?",
//       doc: "Returns true if arg is a procedure; false otherwise.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "string?",
//       doc: "Returns true if arg is a string; false otherwise.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "symbol?",
//       doc: "Returns true if arg is a symbol; false otherwise.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ var: "Arg" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "append",
//       doc: "Returns the result of appending the items of all lsts in order into a single",
//       argTypes: [
//         { tag: "List", element: { var: "Element" } },
//         { tag: "List", element: { var: "Element" } },
//       ],
//       retType: { tag: "List", element: { var: "Element" } },
//     },
//     {
//       id: "car",
//       doc: "Returns the car of pair. Errors if pair is not a pair.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ tag: "List", element: { var: "Element" } }],
//       retType: { var: "Element" },
//     },
//     {
//       id: "cdr",
//       doc: "Returns the cdr of pair. Errors if pair is not a pair.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ tag: "List", element: { var: "Element" } }],
//       retType: { tag: "List", element: { var: "Element" } },
//     },
//     {
//       id: "cons",
//       doc: "Returns a new pair with first as the car and rest as the cdr",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ var: "Element" }, { tag: "List", element: { var: "Element" } }],
//       retType: { tag: "List", element: { var: "Element" } },
//     },
//     {
//       id: "length",
//       doc: "Returns the length of arg. If arg is not a list, this",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ tag: "List", element: { var: "Element" } }],
//       retType: { tag: "Integer" },
//     },
//     {
//       id: "list",
//       doc: "Returns a list with the items in order as its elements.",
//       minArgCount: 1,
//       argTypes: [{ var: "Element" }],
//       retType: { tag: "List", element: { var: "Element" } },
//     },
//     {
//       id: "filter",
//       doc: "Returns a list consisting of only the elements of lst that",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "List", element: { var: "Element" } }],
//       retType: { tag: "List", element: { var: "Element" } },
//     },
//     {
//       id: "reduce",
//       doc: "Returns the result of sequentially combining each element in lst",
//       minArgCount: 2,
//       maxArgCount: 2,
//     },
//     {
//       id: "+",
//       doc: "Returns the sum of all nums. Returns 0 if there are none. If any num is not",
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Number" },
//     },
//     {
//       id: "-",
//       doc: "If there is only one num, return its negation. Otherwise, return the first",
//       minArgCount: 1,
//       argTypes: [{ tag: "Number" }],
//       retType: { tag: "Number" },
//     },
//     {
//       id: "*",
//       doc: "Returns the product of all nums. Returns 1 if there are none. If any num is",
//       argTypes: [{ tag: "Number" }],
//       retType: { tag: "Number" },
//     },
//     {
//       id: "/",
//       doc: "If there are no divisors, return 1 divided by dividend. Otherwise, return",
//       minArgCount: 1,
//       argTypes: [{ tag: "Number" }],
//       retType: { tag: "Number" },
//     },
//     {
//       id: "abs",
//       doc: "Returns the absolute value of num, which must be a number.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ tag: "Number" }],
//       retType: { tag: "Number" },
//     },
//     {
//       id: "expt",
//       doc: "Returns the base raised to the power power. Both must be numbers.",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Number" },
//     },
//     {
//       id: "modulo",
//       doc: "Returns a modulo b. Both must be numbers.",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Integer" },
//     },
//     {
//       id: "quotient",
//       doc: "Returns dividend integer divided by divisor. Both must be numbers.",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Integer" },
//     },
//     {
//       id: "remainder",
//       doc: "Returns the remainder that results when dividend is integer divided by divisor. Both must be numbers. Differs from modulo in behavior when negative numbers are involved.",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Integer" },
//     },
//     {
//       id: "eq?",
//       doc: "If a and b are both numbers, booleans, symbols, or strings, return true if",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Any" }, { tag: "Any" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "equal?",
//       doc: "Returns true if a and b are equivalent. For two pairs, they are equivalent",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Any" }, { tag: "Any" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "not",
//       doc: "Returns true if arg is false-y or false if arg is truthy.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ tag: "Any" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "=",
//       doc: "Returns true if a equals b. Both must be numbers.",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "<",
//       doc: "Returns true if a is less than b. Both must be numbers.",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: ">",
//       doc: "Returns true if a is greater than b. Both must be numbers.",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "<=",
//       doc: "Returns true if a is less than or equal to b. Both must be numbers.",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: ">=",
//       doc: "Returns true if a is greater than or equal to b. Both must be numbers.",
//       minArgCount: 2,
//       maxArgCount: 2,
//       argTypes: [{ tag: "Number" }, { tag: "Number" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "even?",
//       doc: "Returns true if num is even. num must be a number.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ tag: "Number" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "odd?",
//       doc: "Returns true if num is odd. num must be a number.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ tag: "Number" }],
//       retType: { tag: "Boolean" },
//     },
//     {
//       id: "zero?",
//       doc: "Returns true if num is zero. num must be a number.",
//       minArgCount: 1,
//       maxArgCount: 1,
//       argTypes: [{ tag: "Number" }],
//       retType: { tag: "Boolean" },
//     },
//   ] satisfies LibraryCategory[],
//   ({ id }) => id
// );
