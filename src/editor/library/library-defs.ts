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
          { kind: "String", value: "" },
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
