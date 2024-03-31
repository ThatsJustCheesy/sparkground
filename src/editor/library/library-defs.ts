import { Expr } from "../../expr/expr";
import { Any, Never, Untyped } from "../../typechecker/type";
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
      { kind: "struct", name: hole, fields: [] },
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
      { kind: "call", called: { kind: "var", id: "eval" }, args: [] },
    ],
  },
  {
    name: "Logic",
    entries: [
      { kind: "Boolean", value: true },
      { kind: "Boolean", value: false },
      { kind: "if", if: hole, then: hole, else: hole },
      { kind: "and", args: [] },
      { kind: "or", args: [] },
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
          { kind: "call", called: { kind: "var", id: "mod" }, args: [] },
        ],
      },
      {
        name: "Advanced",
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
          { kind: "call", called: { kind: "var", id: "concatenate" }, args: [] },
          { kind: "call", called: { kind: "var", id: "reverse" }, args: [] },
        ],
      },
      {
        name: "Deconstruct",
        entries: [
          { kind: "call", called: { kind: "var", id: "empty?" }, args: [] },
          { kind: "call", called: { kind: "var", id: "first" }, args: [] },
          { kind: "call", called: { kind: "var", id: "rest" }, args: [] },
          { kind: "call", called: { kind: "var", id: "length" }, args: [] },
          { kind: "call", called: { kind: "var", id: "index-of" }, args: [] },
          { kind: "call", called: { kind: "var", id: "contains?" }, args: [] },
        ],
      },
    ],
  },
  {
    name: "Strings",
    subcategories: [
      {
        name: "Manipulate",
        entries: [
          { kind: "String", value: "" },
          { kind: "call", called: { kind: "var", id: "string-concatenate" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string-repeat" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string-length" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string-slice" }, args: [] },
          { kind: "call", called: { kind: "var", id: "string-character-at" }, args: [] },
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
          { kind: "type", type: { tag: "List", of: [Untyped] } },
          { kind: "type", type: { tag: "Function", of: [Untyped] } },
          { kind: "type", type: { tag: "Function", of: [Untyped, Untyped] } },
          {
            kind: "type",
            type: { tag: "Function", of: [Untyped, Untyped, Untyped] },
          },
          {
            kind: "type",
            type: {
              tag: "Function",
              of: [Untyped, Untyped, Untyped, Untyped],
            },
          },
          {
            kind: "type",
            type: { forall: [{ kind: "type-name-hole" }], body: Untyped },
          },
          { kind: "type", type: Any },
          { kind: "type", type: Never },
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
  {
    name: "Components",
    entries: [
      {
        kind: "define",
        name: hole,
        value: {
          kind: "call",
          called: { kind: "var", id: "component" },
          args: [],
        },
      },
      {
        kind: "call",
        called: { kind: "var", id: "to-draw" },
        args: [
          hole,
          {
            kind: "lambda",
            params: [{ kind: "name-binding", id: "state" }],
            body: hole,
          },
        ],
      },
      {
        kind: "call",
        called: { kind: "var", id: "on-tick" },
        args: [
          hole,
          {
            kind: "lambda",
            params: [{ kind: "name-binding", id: "state" }],
            body: { kind: "var", id: "state" },
          },
        ],
      },
      {
        kind: "call",
        called: { kind: "var", id: "on-mouse" },
        args: [
          hole,
          {
            kind: "lambda",
            params: [{ kind: "name-binding", id: "state" }],
            body: { kind: "var", id: "state" },
          },
        ],
      },
      {
        kind: "call",
        called: { kind: "var", id: "on-key" },
        args: [
          hole,
          {
            kind: "lambda",
            params: [{ kind: "name-binding", id: "state" }],
            body: { kind: "var", id: "state" },
          },
        ],
      },
    ],
  },
  {
    name: "Graphics",
    subcategories: [
      {
        name: "Shapes",
        entries: [
          { kind: "call", called: { kind: "var", id: "rectangle" }, args: [] },
          { kind: "call", called: { kind: "var", id: "ellipse" }, args: [] },
          { kind: "call", called: { kind: "var", id: "image" }, args: [] },
        ],
      },
    ],
  },
];
