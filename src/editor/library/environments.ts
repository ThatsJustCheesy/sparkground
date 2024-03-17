import { keyBy, multiply, reduce, repeat, sumBy } from "lodash";
import { Datum, ListDatum, NumberDatum, StringDatum, SymbolDatum } from "../../datum/datum";
import {
  FnValue,
  ListValue,
  Value,
  getVariadic,
  listValueAsVector,
  valueAsBool,
} from "../../evaluator/value";
import { Type } from "../../typechecker/type";
import { TreeIndexPath, extendIndexPath } from "../trees/tree";
import { NameBinding, VarSlot } from "../../expr/expr";
import { Parser } from "../../expr/parse";
import { flattenDatum } from "../../datum/flattened";
import { DynamicTypeAny } from "../../evaluator/dynamic-type";
import { datumEqual } from "../../datum/equality";
import { GraphicValue, drawGraphic } from "../../evaluator/graphics";

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

  headingArgCount?: number;
  bodyArgHints?: string[];

  infix?: boolean;
};

export type Environment<Domain = Value> = Record<string, Binding<Domain>>;

export function makeEnv<Domain = Value>(bindings: Binding<Domain>[]): Environment<Domain> {
  return keyBy(bindings, (binding) => binding.name);
}
export function mergeEnvs<Domain = Value>(
  ...environments: Environment<Domain>[]
): Environment<Domain> {
  return Object.assign({}, ...environments);
}

export function extendEnv<Domain = Value>(
  environment: Environment<Domain>,
  parentIndexPath: TreeIndexPath,
  varSlots: VarSlot[]
) {
  return mergeEnvs(
    environment,
    makeEnv(
      varSlots
        .filter((slot) => slot.kind === "name-binding")
        .map(
          (slot, index): Binding<Domain> => ({
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
      typeAnnotation: {
        tag: "Function",
        of: [
          { tag: "Function*", of: [{ tag: "Any" }, { var: "Out" }] },
          { tag: "List", of: [{ tag: "Any" }] },
          { var: "Out" },
        ],
      },
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
      typeAnnotation: {
        tag: "Function*",
        of: [
          { tag: "Function", of: [{ var: "Element" }, { var: "NewElement" }] },
          { tag: "List", of: [{ var: "Element" }] },
          { tag: "List", of: [{ var: "NewElement" }] },
        ],
        minArgCount: 1,
      },
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
      typeAnnotation: {
        tag: "Function*",
        of: [
          { tag: "Function", of: [{ var: "Element" }, { tag: "Any" }] },
          { tag: "List", of: [{ var: "Element" }] },
          { tag: "Any" },
        ],
        minArgCount: 1,
      },
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
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "Promise", of: [{ var: "Value" }] }, { var: "Value" }],
      },
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
      typeAnnotation: {
        tag: "Function",
        of: [
          {
            tag: "Function",
            of: [{ tag: "Function", of: [{ var: "Result" }, { tag: "Never" }] }, { var: "Result" }],
          },
          { var: "Result" },
        ],
      },
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
      typeAnnotation: { tag: "Function", of: [{ tag: "Any" }, { tag: "Any" }, { tag: "Any" }] },
    },
  },
  {
    name: "not",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "value" }],
        body: (args): Value => {
          const [value] = args as [Value];
          return { kind: "Boolean", value: !valueAsBool(value) };
        },
      },
    },
    attributes: {
      doc: "Logically negates `value`.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Any" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function", of: [{ tag: "Any" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function", of: [{ tag: "Any" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function", of: [{ tag: "Any" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function", of: [{ tag: "Any" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function", of: [{ tag: "Any" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function", of: [{ tag: "Any" }, { tag: "Boolean" }] },
    },
  },
  {
    name: "string->number",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "string", type: "String" }],
        body: (args): Value => {
          const [string] = args as [StringDatum];
          return { kind: "Number", value: Number.parseInt(string.value) };
        },
      },
    },
    attributes: {
      doc: "Parses a number value from `string`, in base ten",
      typeAnnotation: { tag: "Function", of: [{ tag: "String" }, { tag: "Number" }] },
    },
  },
  {
    name: "number->string",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "number", type: "Number" }],
        body: (args): Value => {
          const [number] = args as [StringDatum];
          return { kind: "String", value: new Number(number.value).toString() };
        },
      },
    },
    attributes: {
      doc: "Writes `number` as a string, in base ten.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "String" }] },
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
      typeAnnotation: { tag: "Function", of: [{ tag: "String" }, { tag: "Symbol" }] },
    },
  },
  {
    name: "symbol->string",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "symbol", type: "Symbol" }],
        body: (args): Value => {
          const [name] = args as [SymbolDatum];
          return { kind: "String", value: name.value };
        },
      },
    },
    attributes: {
      doc: "Returns the name of `symbol` as a string.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Symbol" }, { tag: "String" }] },
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
      typeAnnotation: { tag: "Function*", of: [{ tag: "Number" }, { tag: "Number" }] },
      infix: true,
    },
  },
  {
    name: "-",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "number", type: "Number" },
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
      typeAnnotation: {
        tag: "Function*",
        of: [{ tag: "Number" }, { tag: "Number" }],
        minArgCount: 1,
      },
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
      typeAnnotation: { tag: "Function*", of: [{ tag: "Number" }, { tag: "Number" }] },
      infix: true,
    },
  },
  {
    name: "/",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "number", type: "Number" },
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
      typeAnnotation: {
        tag: "Function*",
        of: [{ tag: "Number" }, { tag: "Number" }],
        minArgCount: 1,
      },
      infix: true,
    },
  },
  {
    name: "exp",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "x", type: "Number" }],
        body: (args): Value => {
          const [x] = args as [NumberDatum];
          return {
            kind: "Number",
            value: Math.exp(x.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes the natural exponential function (base e, Euler's number) at `x`.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] },
    },
  },
  {
    name: "log",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "x", type: "Number" }],
        body: (args): Value => {
          const [x] = args as [NumberDatum];
          return {
            kind: "Number",
            value: Math.log(x.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes the natural logarithm (base e, Euler's number) of `x`.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] },
    },
  },
  {
    name: "^",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "base", type: "Number" },
          { name: "exponent", type: "Number" },
        ],
        body: (args): Value => {
          const [base, exponent] = args as [NumberDatum, NumberDatum];
          return {
            kind: "Number",
            value: Math.pow(base.value, exponent.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes `base` raised to the power `exponent`.",
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "Number" }, { tag: "Number" }, { tag: "Number" }],
      },
      infix: true,
    },
  },
  {
    name: "sin",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "angle", type: "Number" }],
        body: (args): Value => {
          const [angle] = args as [NumberDatum];
          return {
            kind: "Number",
            value: Math.sin(angle.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes the sine of `angle` in radians.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] },
    },
  },
  {
    name: "cos",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "angle", type: "Number" }],
        body: (args): Value => {
          const [angle] = args as [NumberDatum];
          return {
            kind: "Number",
            value: Math.cos(angle.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes the cosine of `angle` in radians.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] },
    },
  },
  {
    name: "tan",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "angle", type: "Number" }],
        body: (args): Value => {
          const [angle] = args as [NumberDatum];
          return {
            kind: "Number",
            value: Math.tan(angle.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes the tangent of `angle` in radians.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] },
    },
  },
  {
    name: "asin",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "ratio", type: "Number" }],
        body: (args): Value => {
          const [ratio] = args as [NumberDatum];
          return {
            kind: "Number",
            value: Math.asin(ratio.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes the arcsine of `ratio` in radians.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] },
    },
  },
  {
    name: "acos",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "ratio", type: "Number" }],
        body: (args): Value => {
          const [ratio] = args as [NumberDatum];
          return {
            kind: "Number",
            value: Math.acos(ratio.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes the arc cosine of `ratio` in radians.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] },
    },
  },
  {
    name: "atan",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "ratio", type: "Number" }],
        body: (args): Value => {
          const [ratio] = args as [NumberDatum];
          return {
            kind: "Number",
            value: Math.atan(ratio.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes the arctangent of `ratio` in radians.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] },
    },
  },
  {
    name: "sqrt",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "x", type: "Number" }],
        body: (args): Value => {
          const [x] = args as [NumberDatum];
          return {
            kind: "Number",
            value: Math.sqrt(x.value),
          };
        },
      },
    },
    attributes: {
      doc: "Computes the (principal) square root of `x`.",
      typeAnnotation: { tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] },
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
      typeAnnotation: { tag: "Function*", of: [{ tag: "Number" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function*", of: [{ tag: "Number" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function*", of: [{ tag: "Number" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function*", of: [{ tag: "Number" }, { tag: "Boolean" }] },
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
      typeAnnotation: { tag: "Function*", of: [{ tag: "Number" }, { tag: "Boolean" }] },
      infix: true,
    },
  },
  {
    name: "cons",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "first" }, { name: "rest", type: "List" }],
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
      doc: "Constructs a new list with `first` as the first element and `rest` as the remaining elements.",
      typeAnnotation: {
        tag: "Function",
        of: [
          { var: "Element" },
          { tag: "List", of: [{ var: "Element" }] },
          { tag: "List", of: [{ var: "Element" }] },
        ],
      },
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
      typeAnnotation: {
        tag: "Function*",
        of: [{ var: "Element" }, { tag: "List", of: [{ var: "Element" }] }],
      },
    },
  },
  {
    name: "concatenate",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "lists", type: "List", variadic: true }],
        body: (args): ListValue => {
          const lists = getVariadic<ListValue>(0, args);

          const vecs = lists.map(listValueAsVector).filter((x) => x);
          if (vecs.length !== lists.length) {
            throw "argument to 'concatenate' is an improper list";
          }

          return { kind: "List", heads: (vecs as Value[][]).flat(1) };
        },
      },
    },
    attributes: {
      doc: "Constructs a list consisting of the given `lists` concatenated together.",
      typeAnnotation: {
        tag: "Function*",
        of: [
          { tag: "List", of: [{ var: "Element" }] },
          { tag: "List", of: [{ var: "Element" }] },
        ],
      },
    },
  },
  {
    name: "reverse",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "list", type: "List" }],
        body: (args): ListValue => {
          const [list] = args as [ListValue];

          const vec = listValueAsVector(list);
          if (!vec) {
            throw "argument to 'reverse' is an improper list";
          }

          return { kind: "List", heads: [...vec].reverse() };
        },
      },
    },
    attributes: {
      doc: "Constructs a new list consisting of the elements of `list` in reverse order.",
      typeAnnotation: {
        tag: "Function",
        of: [
          { tag: "List", of: [{ var: "Element" }] },
          { tag: "List", of: [{ var: "Element" }] },
        ],
      },
    },
  },
  {
    name: "first",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "list", type: "List" }],
        body: (args): Value => {
          const [list] = args as [ListDatum];
          // TODO: Length check
          return list.heads[0]!;
        },
      },
    },
    attributes: {
      doc: "Returns the first element of `list`.",
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "List", of: [{ var: "Element" }] }, { var: "Element" }],
      },
    },
  },
  {
    name: "rest",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "list", type: "List" }],
        body: (args): Value => {
          const [list] = args as [ListDatum];
          if (list.heads.length > 1) {
            return { kind: "List", heads: [...list.heads.slice(1)], tail: list.tail };
          } else {
            return list.tail ?? { kind: "List", heads: [] };
          }
        },
      },
    },
    attributes: {
      doc: "Returns a copy of `list` with the first element removed.",
      typeAnnotation: {
        tag: "Function",
        of: [
          { tag: "List", of: [{ var: "Element" }] },
          { tag: "List", of: [{ var: "Element" }] },
        ],
      },
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
      doc: "Determines whether `obj` is the empty list.",
      typeAnnotation: {
        tag: "Function",
        of: [
          { tag: "List", of: [{ var: "Element" }] },
          { tag: "List", of: [{ var: "Element" }] },
        ],
      },
    },
  },
  {
    name: "length",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "list", type: "List" }],
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
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "List", of: [{ var: "Element" }] }, { tag: "Integer" }],
      },
    },
  },
  {
    name: "length",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "list", type: "List" }],
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
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "List", of: [{ var: "Element" }] }, { tag: "Integer" }],
      },
    },
  },
  {
    name: "index-of",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "list", type: "List" },
          { name: "item", type: DynamicTypeAny },
        ],
        body: (args): Value => {
          const [list, item] = args as [ListValue, Value];

          const vector = listValueAsVector(list);
          if (vector === undefined) {
            throw "argument passed to 'index-of' is an improper list";
          }

          return {
            kind: "Number",
            value: vector.findIndex((listItem) => datumEqual(listItem, item)),
          };
        },
      },
    },
    attributes: {
      doc: "Returns the first index of `item` in `list`, or -1 if there is no such index.",
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "List", of: [{ var: "Element" }] }, { var: "Element" }, { tag: "Integer" }],
      },
    },
  },
  {
    name: "contains?",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "list", type: "List" },
          { name: "item", type: DynamicTypeAny },
        ],
        body: (args): Value => {
          const [list, item] = args as [ListValue, Value];

          const vector = listValueAsVector(list);
          if (vector === undefined) {
            throw "argument passed to 'contains?' is an improper list";
          }

          return { kind: "Boolean", value: vector.some((listItem) => datumEqual(listItem, item)) };
        },
      },
    },
    attributes: {
      doc: "Determines whether `item` is in `list`.",
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "List", of: [{ var: "Element" }] }, { var: "Element" }, { tag: "Boolean" }],
      },
    },
  },
  {
    name: "string-concatenate",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "strings", type: "String", variadic: true }],
        body: (args): Value => {
          const strings = getVariadic<StringDatum>(0, args);
          return {
            kind: "String",
            value: strings.map(({ value }) => value).reduce((acc, s) => acc + s),
          };
        },
      },
    },
    attributes: {
      doc: "Concatenates the given `strings` together, in order.",
      typeAnnotation: {
        tag: "Function*",
        of: [{ tag: "String" }, { tag: "String" }],
      },
    },
  },
  {
    name: "string-repeat",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "string", type: "String" },
          { name: "count", type: "Number" },
        ],
        body: (args): Value => {
          const [string, count] = args as [StringDatum, NumberDatum];
          return { kind: "String", value: repeat(string.value, count.value) };
        },
      },
    },
    attributes: {
      doc: "Creates a new string consisting of `count` copies of `string`.",
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "String" }, { tag: "Integer" }, { tag: "String" }],
      },
    },
  },
  {
    name: "string-length",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "string", type: "String" }],
        body: (args): Value => {
          const [string] = args as [StringDatum];
          return { kind: "Number", value: string.value.length };
        },
      },
    },
    attributes: {
      doc: "Returns the number of characters in `string`.",
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "String" }, { tag: "Integer" }],
      },
    },
  },
  {
    name: "string-slice",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "string", type: "String" },
          { name: "start", type: "Number", optional: true },
          { name: "end", type: "Number", optional: true },
        ],
        body: (args): Value => {
          const [string, start, end] = args as [
            StringDatum,
            NumberDatum | undefined,
            NumberDatum | undefined
          ];
          const startIdx = start ? start.value : undefined;
          const endIdx = end ? end.value : undefined;
          return { kind: "String", value: string.value.slice(startIdx, endIdx) };
        },
      },
    },
    attributes: {
      doc: "Returns the characters in `string` from `start` (inclusive) to `end` (exclusive). If not given, `start` is 0, and `end` is the length of `string`.",
      typeAnnotation: {
        tag: "Function*",
        of: [{ tag: "String" }, { tag: "Integer" }, { tag: "Integer" }, { tag: "String" }],
        minArgCount: 1,
        maxArgCount: 3,
      },
    },
  },
  {
    name: "string-character-at",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "string", type: "String" },
          { name: "index", type: "Number" },
        ],
        body: (args): Value => {
          const [string, index] = args as [StringDatum, NumberDatum];
          const char = string.value.at(index.value);
          return { kind: "String", value: char ?? "" };
        },
      },
    },
    attributes: {
      doc: "Returns the character in `string` at `index`. If there is no such character, returns the empty string.",
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "String" }, { tag: "Integer" }, { tag: "String" }],
      },
    },
  },
  {
    name: "draw",
    cell: {
      value: {
        kind: "fn",
        signature: [{ name: "graphic", type: "List" }],
        body: (args): Value => {
          const [graphic] = args as [GraphicValue];

          const canvas = document.querySelector(".output-area canvas");
          if (canvas) {
            const ctx = (canvas as HTMLCanvasElement).getContext?.("2d");
            if (ctx) drawGraphic(ctx, graphic);
          }

          return { kind: "List", heads: [] };
        },
      },
    },
    attributes: {
      doc: "Draws a graphic to the screen.",
      typeAnnotation: {
        tag: "Function",
        of: [{ tag: "Graphic" }, { tag: "Empty" }],
      },
    },
  },
  {
    name: "animate",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "duration", type: "Number" },
          { name: "graphic", type: "fn" },
        ],
        body: (args, evaluator): Value => {
          const [duration, graphicFn] = args as [NumberDatum, FnValue];

          let t = 0;
          const tMax = duration.value * 1000;

          const intervalID = setInterval(() => {
            t += 1000 / 24;
            console.log(t, tMax);
            if (t > tMax) clearInterval(intervalID);

            // TODO: Dynamic typecheck!
            const graphic = evaluator.call(graphicFn, [
              { kind: "Number", value: t / 1000 },
            ]) as GraphicValue;

            const canvas = document.querySelector(".output-area canvas");
            if (canvas) {
              const ctx = (canvas as HTMLCanvasElement).getContext?.("2d");
              if (ctx) drawGraphic(ctx, graphic);
            }

            return { kind: "List", heads: [] };
          }, 1000 / 24);

          return { kind: "List", heads: [] };
        },
      },
    },
    attributes: {
      doc: "Animates a continuous succession of `graphics` for `duration` seconds.",
      typeAnnotation: {
        tag: "Function",
        of: [
          { tag: "Number" },
          { tag: "Function", of: [{ tag: "Number" }, { tag: "Graphic" }] },
          { tag: "Empty" },
        ],
      },
      headingArgCount: 1,
    },
  },
  {
    name: "ellipse",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "x", type: "Number" },
          { name: "y", type: "Number" },
          { name: "x-radius", type: "Number" },
          { name: "y-radius", type: "Number" },
        ],
        body: (args): Value => {
          type ND = NumberDatum;
          const [x, y, xRadius, yRadius] = args as [ND, ND, ND, ND];

          return {
            kind: "List",
            heads: [{ kind: "Symbol", value: "ellipse" }, x, y, xRadius, yRadius],
          };
        },
      },
    },
    attributes: {
      doc: "Makes an ellipse graphic.",
      typeAnnotation: {
        tag: "Function",
        of: [
          { tag: "Number" },
          { tag: "Number" },
          { tag: "Number" },
          { tag: "Number" },
          { tag: "Graphic" },
        ],
      },
    },
  },
  {
    name: "rectangle",
    cell: {
      value: {
        kind: "fn",
        signature: [
          { name: "x", type: "Number" },
          { name: "y", type: "Number" },
          { name: "width", type: "Number" },
          { name: "height", type: "Number" },
        ],
        body: (args): Value => {
          type ND = NumberDatum;
          const [x, y, width, height] = args as [ND, ND, ND, ND];

          return {
            kind: "List",
            heads: [{ kind: "Symbol", value: "rectangle" }, x, y, width, height],
          };
        },
      },
    },
    attributes: {
      doc: "Makes a rectangle graphic.",
      typeAnnotation: {
        tag: "Function",
        of: [
          { tag: "Number" },
          { tag: "Number" },
          { tag: "Number" },
          { tag: "Number" },
          { tag: "Graphic" },
        ],
      },
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
