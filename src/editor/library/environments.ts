import { keyBy } from "lodash";
import { ListDatum } from "../../datum/datum";
import { ListValue, Value } from "../../evaluator/value";
import { Type } from "../../typechecker/type";

export type Cell<Domain> = {
  value?: Domain;
};

export type Binding<Domain> = {
  name: string;
  cell: Cell<Domain>;
  attributes?: BindingAttributes;
};

export type BindingAttributes = {
  doc?: string;

  argTypes?: Type[];
  retType?: Type;
  minArgCount?: number;
  maxArgCount?: number;

  headingArgCount?: number;
  bodyArgHints?: string[];
};

export type Environment = Record<string, Binding<Value>>;

export function makeEnv(bindings: Binding<Value>[]): Environment {
  return keyBy(bindings, (binding) => binding.name);
}
export function mergeEnvs(...environments: Environment[]): Environment {
  return Object.assign({}, ...environments);
}

// https://conservatory.scheme.org/schemers/Documents/Standards/R5RS/HTML/r5rs-Z-H-9.html#%_chap_6
export const SchemeReportEnvironment: Environment = makeEnv([
  {
    name: "apply",
    value: {
      kind: "fn",
      params: ["proc", "args"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Calls `proc` with the elements of `args` as arguments.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [
        { tag: "Function", in: { tag: "Any" }, out: { var: "Out" } },
        { tag: "List", element: { tag: "Any" } },
      ],
      retType: { var: "Out" },
    },
  },
  {
    name: "map",
    value: {
      kind: "fn",
      params: ["proc", "lists..."],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Applies `proc` elementwise to the elements of `lists` and returns a list of the results, in order.",
      minArgCount: 1,
      argTypes: [
        { tag: "Function", in: { var: "Element" }, out: { var: "NewElement" } },
        { tag: "List", element: { var: "Element" } },
      ],
      retType: { tag: "List", element: { var: "NewElement" } },
    },
  },
  {
    name: "for-each",
    value: {
      kind: "fn",
      params: ["proc", "lists..."],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Runs `proc` on the elements of `lists`, in order from the first element to the last. Any values that `proc` returns are discarded.",
      minArgCount: 1,
      argTypes: [
        { tag: "Function", in: { var: "Element" }, out: { tag: "Any" } },
        { tag: "List", element: { var: "Element" } },
      ],
      retType: { tag: "Any" },
    },
  },
  {
    name: "force",
    value: {
      kind: "fn",
      params: ["promise"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Continues the delayed computation represented by `promise`.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Promise", value: { var: "Value" } }],
      retType: { var: "Value" },
    },
  },
  {
    name: "call-with-current-continuation",
    value: {
      kind: "fn",
      params: ["next"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: 'Packages the current continuation as an "escape function", and transfers control to `next` with the escape function as its sole argument. Calling the escape function transfers control to the point immediately after `call-with-current-continuation`. This function returns the value passed to the escape function (each time it is called), as well as the value returned by `next` (if it ever returns).',
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [
        {
          tag: "Function",
          in: { tag: "Function", in: { var: "Result" }, out: { tag: "Never" } },
          out: { var: "Result" },
        },
      ],
      retType: { var: "Result" },
    },
  },
  {
    name: "eval",
    value: {
      kind: "fn",
      params: ["expression", "environment"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Evaluates `expression`, using the bindings in `environment` for name resolution.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Any" }, { tag: "Any" }],
      retType: { tag: "Any" },
    },
  },
  {
    name: "boolean?",
    value: {
      kind: "fn",
      params: ["obj"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Determines whether `obj` is a boolean (true or false) value.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Any" }],
      retType: { tag: "Boolean" },
    },
  },
  {
    name: "symbol?",
    value: {
      kind: "fn",
      params: ["obj"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Determines whether `obj` is a symbol value.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Any" }],
      retType: { tag: "Boolean" },
    },
  },
  {
    name: "number?",
    value: {
      kind: "fn",
      params: ["obj"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Determines whether `obj` is a number value.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Any" }],
      retType: { tag: "Boolean" },
    },
  },
  {
    name: "string?",
    value: {
      kind: "fn",
      params: ["obj"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Determines whether `obj` is a string value.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Any" }],
      retType: { tag: "Boolean" },
    },
  },
  {
    name: "list?",
    value: {
      kind: "fn",
      params: ["obj"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Determines whether `obj` is a list value.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Any" }],
      retType: { tag: "Boolean" },
    },
  },
  {
    name: "procedure?",
    value: {
      kind: "fn",
      params: ["obj"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Determines whether `obj` is a procedure (function) value.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Any" }],
      retType: { tag: "Boolean" },
    },
  },
  {
    name: "string->number",
    value: {
      kind: "fn",
      params: ["string", "radix"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Parses a number value from `string`. The number is assumed to be written with `radix` as the base. If no `radix` is given, the default is ten; i.e., the number is taken as written in base ten.",
      minArgCount: 1,
      maxArgCount: 2,
      argTypes: [{ tag: "String" }, { tag: "Integer" }],
      retType: { tag: "Number" },
    },
  },
  {
    name: "number->string",
    value: {
      kind: "fn",
      params: ["number", "radix"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Writes `number` as a string, using `radix` as the base. If no `radix` is given, the default is ten; i.e., the number will be written in base ten.",
      minArgCount: 1,
      maxArgCount: 2,
      argTypes: [{ tag: "Number" }, { tag: "Integer" }],
      retType: { tag: "String" },
    },
  },
  {
    name: "string->symbol",
    value: {
      kind: "fn",
      params: ["name"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Returns the unique symbol with the given `name`.",
      minArgCount: 1,
      maxArgCount: 2,
      argTypes: [{ tag: "String" }],
      retType: { tag: "Symbol" },
    },
  },
  {
    name: "symbol->string",
    value: {
      kind: "fn",
      params: ["symbol"],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Returns the name of `symbol` as a string.",
      minArgCount: 1,
      maxArgCount: 2,
      argTypes: [{ tag: "Symbol" }],
      retType: { tag: "String" },
    },
  },
  {
    name: "+",
    value: {
      kind: "fn",
      params: ["numbers..."],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Adds `numbers`. If given no numbers, the result is 0.",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
    },
  },
  {
    name: "-",
    value: {
      kind: "fn",
      params: ["number", "numbers..."],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "If given at least two arguments, subtracts the sum of all subsequent `numbers` from the first one. If given only one argument, subtracts `number` from 0 (acting as unary minus).",
      minArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
    },
  },
  {
    name: "*",
    value: {
      kind: "fn",
      params: ["numbers..."],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Multiplies `numbers`. If given no numbers, the result is 1.",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
    },
  },
  {
    name: "/",
    value: {
      kind: "fn",
      params: ["number", "numbers..."],
      body: (env): Value => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "If given at least two arguments, divides the first `number` by the product of all subsequent ones. If given only one argument, divides 1 by `number` (acting as reciprocal).",
      minArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
    },
  },
  {
    name: "cons",
    value: {
      kind: "fn",
      params: ["car", "cdr"],
      body: (env): ListValue => {
        const car = env.get("car")!.value;
        const cdr = env.get("cdr")!.value as ListDatum; // TODO: Dynamic type checking
        return {
          kind: "list",
          heads: [car],
          tail: cdr,
        };
      },
    },
    attributes: {
      doc: "Constructs a pair with `car` as the head and `cdr` as the tail. If `cdr` is a list, the resulting pair is a list.",
      minArgCount: 2,
      maxArgCount: 2,
    },
  },
  {
    name: "list",
    value: {
      kind: "fn",
      params: ["elements..."],
      body: (env): ListValue => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Constructs a list from the given `elements`.",
      argTypes: [{ var: "Element" }],
      retType: { tag: "List", element: { var: "Element" } },
    },
  },
  {
    name: "append",
    value: {
      kind: "fn",
      params: ["lists..."],
      body: (env): ListValue => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Constructs a list consisting of the given `lists` concatenated together.",
      argTypes: [
        { tag: "List", element: { var: "Element" } },
        { tag: "List", element: { var: "Element" } },
      ],
      retType: { tag: "List", element: { var: "Element" } },
    },
  },
  {
    name: "reverse",
    value: {
      kind: "fn",
      params: ["list"],
      body: (env): ListValue => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Constructs a new list consisting of the elements of `list` in reverse order.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "List", element: { var: "Element" } }],
      retType: { tag: "List", element: { var: "Element" } },
    },
  },
  {
    name: "car",
    value: {
      kind: "fn",
      params: ["pair"],
      body: (env): ListValue => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Returns the first element of `pair`. (If `pair` is a list, this is the head.)",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "List", element: { var: "Element" } }],
      retType: { var: "Element" },
    },
  },
  {
    name: "cdr",
    value: {
      kind: "fn",
      params: ["pair"],
      body: (env): ListValue => {
        throw "TODO";
      },
    },
    attributes: {
      doc: "Returns the second element of `pair`. (If `pair` is a list, this is the tail.)",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "List", element: { var: "Element" } }],
      retType: { tag: "List", element: { var: "Element" } },
    },
  },
]);

export const ExtensionsEnvironment: Environment = makeEnv([
  {
    name: "null",
    value: {
      kind: "fn",
      params: [],
      body: (env): ListValue => {
        return {
          kind: "list",
          heads: [],
        };
      },
    },
  },
]);

export const InitialEnvironment: Environment = mergeEnvs(
  ExtensionsEnvironment,
  SchemeReportEnvironment
);
