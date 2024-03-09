import { keyBy, multiply, reduce, sumBy } from "lodash";
import { Datum, ListDatum, NumberDatum, StringDatum, SymbolDatum } from "../../datum/datum";
import { FnValue, ListValue, Value, getVariadic, listValueAsVector } from "../../evaluator/value";
import { Type } from "../../typechecker/type";
import { TreeIndexPath, extendIndexPath } from "../trees/tree";
import { NameBinding, VarSlot } from "../../expr/expr";
import { Parser } from "../../expr/parse";
import { flattenDatum } from "../../datum/flattened";

export type Cell<Domain> = {
  value?: Domain;
};

export type Binding<Domain> = {
  name: string;
  cell: Cell<Domain>;
  attributes?: BindingAttributes;
};

export type BindingAttributes = {
  typeAnnotation?: Type;
  binder?: TreeIndexPath;
  doc?: string;

  argTypes?: Type[];
  retType?: Type;
  minArgCount?: number;
  maxArgCount?: number;

  headingArgCount?: number;
  bodyArgHints?: string[];

  infix?: boolean;
};

export type Environment = Record<string, Binding<Value>>;

export function makeEnv(bindings: Binding<Value>[]): Environment {
  return keyBy(bindings, (binding) => binding.name);
}
export function mergeEnvs(...environments: Environment[]): Environment {
  return Object.assign({}, ...environments);
}

export function extendEnv(
  environment: Environment,
  parentIndexPath: TreeIndexPath,
  varSlots: VarSlot[]
) {
  return mergeEnvs(
    environment,
    makeEnv(
      varSlots
        .filter((slot) => slot.kind === "name-binding")
        .map(
          (slot, index): Binding<Value> => ({
            name: (slot as NameBinding).id,
            cell: {},
            attributes: {
              typeAnnotation: (slot as NameBinding).type,
              binder: extendIndexPath(parentIndexPath, index),
            },
          })
        )
    )
  );
}

// TODO: Move this
function chainCompare<Item>(
  items: Item[],
  compare: (item1: Item, item2: Item) => boolean
): boolean {
  if (items.length === 0) return true;

  let prev = items[0]!;
  let satisfied = true;
  for (let i = 1; i < items.length && satisfied; i++) {
    const cur = items[i]!;
    if (compare(prev, cur)) prev = cur;
    else satisfied = false;
  }

  return satisfied;
}

// https://conservatory.scheme.org/schemers/Documents/Standards/R5RS/HTML/r5rs-Z-H-9.html#%_chap_6
export const SchemeReportEnvironment: Environment = makeEnv([
  {
    name: "apply",
    cell: {
      value: {
        kind: "fn",
        signature: [
          {
            name: "function",
            type: "Function",
          },
          {
            name: "args",
            type: "List",
          },
        ],
        body: (args, evaluator): Value => {
          const [fn, argList] = args as [FnValue, ListValue];

          const argv = listValueAsVector(argList);
          if (!argv) throw "argument list passed to 'apply' is an improper list";

          return evaluator.call(fn, argv);
        },
      },
    },
    attributes: {
      doc: "Calls `function` with the elements of `args` as arguments.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [
        { tag: "Function*", of: [{ tag: "Any" }, { var: "Out" }] },
        { tag: "List", of: [{ tag: "Any" }] },
      ],
      retType: { var: "Out" },
    },
  },
  {
    name: "map",
    cell: {
      value: {
        kind: "fn",
        signature: [
          {
            name: "function",
            type: "Function",
          },
          {
            name: "lists",
            type: "List",
            variadic: true,
          },
        ],
        body: (args, evaluator): Value => {
          const [fn] = args as [FnValue];
          const lists = getVariadic<ListValue>(1, args);

          if (!lists.length) return { kind: "List", heads: [] };

          const vectors = lists.map(listValueAsVector);
          if (vectors.some((vector) => vector === undefined)) {
            throw "one of the lists passed to 'map' is an improper list";
          }
          const rows = vectors as Value[][];

          const width = vectors[0]!.length;
          let results: Value[] = [];
          for (let i = 0; i < width; i++) {
            const tentativeCol = rows.map((row) => row[i]);
            if (tentativeCol.some((entry) => entry === undefined)) {
              throw "lists passed to 'map' have different length";
            }
            const col = tentativeCol as Value[];

            results.push(evaluator.call(fn, col));
          }

          return { kind: "List", heads: results };
        },
      },
    },
    attributes: {
      doc: "Applies `function` elementwise to the elements of `lists` and returns a list of the results, in order.",
      minArgCount: 1,
      argTypes: [
        { tag: "Function", of: [{ var: "Element" }, { var: "NewElement" }] },
        { tag: "List", of: [{ var: "Element" }] },
      ],
      retType: { tag: "List", of: [{ var: "NewElement" }] },
    },
  },
  {
    name: "for-each",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "proc", type: "Function" },
          { name: "lists", type: "List", variadic: true },
        ],
        body: (args, evaluator): Value => {
          const [proc] = args as [FnValue];
          const lists = getVariadic<ListValue>(1, args);

          if (!lists.length) return { kind: "List", heads: [] };

          const vectors = lists.map(listValueAsVector);
          if (vectors.some((vector) => vector === undefined)) {
            throw "one of the lists passed to 'for-each' is an improper list";
          }
          const rows = vectors as Value[][];

          const width = vectors[0]!.length;
          for (let i = 0; i < width; i++) {
            const tentativeCol = rows.map((row) => row[i]);
            if (tentativeCol.some((entry) => entry === undefined)) {
              throw "lists passed to 'for-each' have different length";
            }
            const col = tentativeCol as Value[];

            evaluator.call(proc, col);
          }

          return { kind: "List", heads: [] };
        },
      },
    },
    attributes: {
      doc: "Runs `proc` on the elements of `lists`, in order from the first element to the last. Any values that `proc` returns are discarded.",
      minArgCount: 1,
      argTypes: [
        { tag: "Function", of: [{ var: "Element" }, { tag: "Any" }] },
        { tag: "List", of: [{ var: "Element" }] },
      ],
      retType: { tag: "Any" },
    },
  },
  {
    name: "force",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "promise", type: "Promise" }],
        body: (args): Value => {
          throw "TODO";
        },
      },
    },
    attributes: {
      doc: "Continues the delayed computation represented by `promise`.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "Promise", of: [{ var: "Value" }] }],
      retType: { var: "Value" },
    },
  },
  {
    name: "call-with-current-continuation",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "next", type: "Function" }],
        body: (args): Value => {
          throw "TODO";
        },
      },
    },
    attributes: {
      doc: 'Packages the current continuation as an "escape function", and transfers control to `next` with the escape function as its sole argument. Calling the escape function transfers control to the point immediately after `call-with-current-continuation`. This function returns the value passed to the escape function (each time it is called), as well as the value returned by `next` (if it ever returns).',
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [
        {
          tag: "Function",
          of: [{ tag: "Function", of: [{ var: "Result" }, { tag: "Never" }] }, { var: "Result" }],
        },
      ],
      retType: { var: "Result" },
    },
  },
  {
    name: "eval",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "expression" }, { name: "environment" }],
        body: (args, evaluator): Value => {
          const [expression, env] = args as [Value, Value];
          if (expression.kind === "fn") {
            throw "expression passed to 'eval' must not be a function value";
          }

          let expressionDatum: Datum;
          if (expression.kind === "List") {
            const vector = listValueAsVector(expression);
            if (vector === undefined) {
              throw "expression passed to 'eval' is an improper list";
            }
            expressionDatum = { kind: "List", heads: vector as Datum[] };
          } else {
            expressionDatum = expression;
          }

          // TODO: Use env (what should be the runtime representation?)

          return evaluator.eval(new Parser().parsePrimary(flattenDatum(expressionDatum)));
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "obj" }],
        body: (args): Value => {
          const [obj] = args as [Value];
          return { kind: "Boolean", value: obj.kind === "Boolean" };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "obj" }],
        body: (args): Value => {
          const [obj] = args as [Value];
          return { kind: "Boolean", value: obj.kind === "Symbol" };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "obj" }],
        body: (args): Value => {
          const [obj] = args as [Value];
          return { kind: "Boolean", value: obj.kind === "Number" };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "obj" }],
        body: (args): Value => {
          const [obj] = args as [Value];
          return { kind: "Boolean", value: obj.kind === "String" };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "obj" }],
        body: (args): Value => {
          const [obj] = args as [Value];
          return { kind: "Boolean", value: obj.kind === "List" };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "obj" }],
        body: (args): Value => {
          const [obj] = args as [Value];
          return { kind: "Boolean", value: obj.kind === "fn" };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "String", type: "String" },
          { name: "radix", type: "Number" },
        ],
        body: (args): Value => {
          const [string, radix] = args as [StringDatum, NumberDatum];
          return { kind: "Number", value: Number.parseInt(string.value, radix.value) };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "Number", type: "Number" },
          { name: "radix", type: "Number" },
        ],
        body: (args): Value => {
          const [number, radix] = args as [StringDatum, NumberDatum];
          return { kind: "String", value: new Number(number.value).toString(radix.value) };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "name", type: "String" }],
        body: (args): Value => {
          const [name] = args as [StringDatum];
          return { kind: "Symbol", value: name.value };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "Symbol", type: "Symbol" }],
        body: (args): Value => {
          const [name] = args as [SymbolDatum];
          return { kind: "String", value: name.value };
        },
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
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "numbers", type: "Number", variadic: true }],
        body: (args): Value => {
          const numbers = getVariadic<NumberDatum>(0, args);
          return { kind: "Number", value: sumBy(numbers, ({ value }) => value) };
        },
      },
    },
    attributes: {
      doc: "Adds `numbers`. If given no numbers, the result is 0.",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
      infix: true,
    },
  },
  {
    name: "-",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "Number", type: "Number" },
          { name: "numbers", type: "Number", variadic: true },
        ],
        body: (args): Value => {
          const [number] = args as [NumberDatum];
          const numbers = getVariadic<NumberDatum>(1, args);
          return {
            kind: "Number",
            value: numbers.length
              ? number.value - sumBy(numbers, ({ value }) => value)
              : -number.value,
          };
        },
      },
    },
    attributes: {
      doc: "If given at least two arguments, subtracts the sum of all subsequent `numbers` from the first one. If given only one argument, subtracts `number` from 0 (acting as unary minus).",
      minArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
      infix: true,
    },
  },
  {
    name: "*",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "numbers", type: "Number", variadic: true }],
        body: (args): Value => {
          const numbers = getVariadic<NumberDatum>(0, args);
          return {
            kind: "Number",
            value: reduce(
              numbers.map(({ value }) => value),
              multiply,
              1
            ),
          };
        },
      },
    },
    attributes: {
      doc: "Multiplies `numbers`. If given no numbers, the result is 1.",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
      infix: true,
    },
  },
  {
    name: "/",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "Number", type: "Number" },
          { name: "numbers", type: "Number", variadic: true },
        ],
        body: (args): Value => {
          const [number] = args as [NumberDatum];
          const numbers = getVariadic<NumberDatum>(1, args);
          return {
            kind: "Number",
            value: numbers.length
              ? number.value /
                reduce(
                  numbers.map(({ value }) => value),
                  multiply,
                  1
                )
              : 1 / number.value,
          };
        },
      },
    },
    attributes: {
      doc: "If given at least two arguments, divides the first `number` by the product of all subsequent ones. If given only one argument, divides 1 by `number` (acting as reciprocal).",
      minArgCount: 1,
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Number" },
      infix: true,
    },
  },
  {
    name: "=",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "numbers", type: "Number", variadic: true }],
        body: (args): Value => {
          const numbers = getVariadic<NumberDatum>(0, args);
          return {
            kind: "Boolean",
            value: chainCompare(numbers, (item1, item2) => item1.value === item2.value),
          };
        },
      },
    },
    attributes: {
      doc: "Returns whether `numbers` are all equal to each other.",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Boolean" },
      infix: true,
    },
  },
  {
    name: "<",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "numbers", type: "Number", variadic: true }],
        body: (args): Value => {
          const numbers = getVariadic<NumberDatum>(0, args);
          return {
            kind: "Boolean",
            value: chainCompare(numbers, (item1, item2) => item1.value < item2.value),
          };
        },
      },
    },
    attributes: {
      doc: "Returns whether `numbers` are in strictly decreasing order.",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Boolean" },
      infix: true,
    },
  },
  {
    name: ">",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "numbers", type: "Number", variadic: true }],
        body: (args): Value => {
          const numbers = getVariadic<NumberDatum>(0, args);
          return {
            kind: "Boolean",
            value: chainCompare(numbers, (item1, item2) => item1.value > item2.value),
          };
        },
      },
    },
    attributes: {
      doc: "Returns whether `numbers` are in strictly increasing order.",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Boolean" },
      infix: true,
    },
  },
  {
    name: "<=",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "numbers", type: "Number", variadic: true }],
        body: (args): Value => {
          const numbers = getVariadic<NumberDatum>(0, args);
          return {
            kind: "Boolean",
            value: chainCompare(numbers, (item1, item2) => item1.value <= item2.value),
          };
        },
      },
    },
    attributes: {
      doc: "Returns whether `numbers` are in (non-strictly) decreasing order.",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Boolean" },
      infix: true,
    },
  },
  {
    name: ">=",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "numbers", type: "Number", variadic: true }],
        body: (args): Value => {
          const numbers = getVariadic<NumberDatum>(0, args);
          return {
            kind: "Boolean",
            value: chainCompare(numbers, (item1, item2) => item1.value >= item2.value),
          };
        },
      },
    },
    attributes: {
      doc: "Returns whether `numbers` are in (non-strictly) increasing order.",
      argTypes: [{ tag: "Number" }],
      retType: { tag: "Boolean" },
      infix: true,
    },
  },
  {
    name: "cons",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "head" }, { name: "tail" }],
        body: (args): ListValue => {
          const [head, tail] = args as [Value, Value];
          return {
            kind: "List",
            heads: [head],
            tail,
          };
        },
      },
    },
    attributes: {
      doc: "Constructs a pair with `head` as the head and `tail` as the tail. If `tail` is a list, the resulting pair is a list.",
      minArgCount: 2,
      maxArgCount: 2,
      argTypes: [{ tag: "Any" }, { tag: "List", of: [{ tag: "Any" }] }],
      retType: { tag: "List", of: [{ tag: "Any" }] },
    },
  },
  {
    name: "list",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "elements", variadic: true }],
        body: (args): ListValue => {
          const elements = getVariadic(0, args);
          return {
            kind: "List",
            heads: elements,
          };
        },
      },
    },
    attributes: {
      doc: "Constructs a list from the given `elements`.",
      argTypes: [{ var: "Element" }],
      retType: { tag: "List", of: [{ var: "Element" }] },
    },
  },
  {
    name: "append",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "lists", type: "List", variadic: true }],
        body: (args): ListValue => {
          const lists = getVariadic<ListValue>(0, args);
          throw "TODO";
        },
      },
    },
    attributes: {
      doc: "Constructs a list consisting of the given `lists` concatenated together.",
      argTypes: [
        { tag: "List", of: [{ var: "Element" }] },
        { tag: "List", of: [{ var: "Element" }] },
      ],
      retType: { tag: "List", of: [{ var: "Element" }] },
    },
  },
  {
    name: "reverse",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "lists", type: "List" }],
        body: (args): ListValue => {
          throw "TODO";
        },
      },
    },
    attributes: {
      doc: "Constructs a new list consisting of the elements of `list` in reverse order.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "List", of: [{ var: "Element" }] }],
      retType: { tag: "List", of: [{ var: "Element" }] },
    },
  },
  {
    name: "first",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "pair", type: "List" }],
        body: (args): Value => {
          const [pair] = args as [ListDatum];
          // TODO: Length check
          return pair.heads[0]!;
        },
      },
    },
    attributes: {
      doc: "Returns the first element of `pair`. (If `pair` is a list, this is the head.)",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "List", of: [{ var: "Element" }] }],
      retType: { var: "Element" },
    },
  },
  {
    name: "rest",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "pair", type: "List" }],
        body: (args): Value => {
          const [pair] = args as [ListDatum];
          if (pair.heads.length > 1) {
            return { kind: "List", heads: [...pair.heads.slice(1)], tail: pair.tail };
          } else {
            return pair.tail ?? { kind: "List", heads: [] };
          }
        },
      },
    },
    attributes: {
      doc: "Returns the second element of `pair`. (If `pair` is a list, this is the tail.)",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "List", of: [{ var: "Element" }] }],
      retType: { tag: "List", of: [{ var: "Element" }] },
    },
  },
  {
    name: "empty?",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "obj" }],
        body: (args): Value => {
          const [obj] = args;
          return { kind: "Boolean", value: obj?.kind === "List" && obj.heads.length === 0 };
        },
      },
    },
    attributes: {
      doc: "Returns whether `obj` is the empty list.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "List", of: [{ var: "Element" }] }],
      retType: { tag: "List", of: [{ var: "Element" }] },
    },
  },
  {
    name: "length",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "List", type: "List" }],
        body: (args): Value => {
          const [list] = args as [ListValue];

          const vector = listValueAsVector(list);
          if (vector === undefined) {
            throw "argument passed to 'length' is an improper list";
          }

          return { kind: "Number", value: vector.length };
        },
      },
    },
    attributes: {
      doc: "Returns the number of elements in `list`.",
      minArgCount: 1,
      maxArgCount: 1,
      argTypes: [{ tag: "List", of: [{ var: "Element" }] }],
      retType: { tag: "Integer" },
    },
  },
]);

export const ExtensionsEnvironment: Environment = makeEnv([
  {
    name: "null",
    cell: {
      value: {
        kind: "fn",
        signature: [],
        body: (args): ListValue => {
          return {
            kind: "List",
            heads: [],
          };
        },
      },
    },
  },
]);

export const InitialEnvironment: Environment = mergeEnvs(
  ExtensionsEnvironment,
  SchemeReportEnvironment
);
