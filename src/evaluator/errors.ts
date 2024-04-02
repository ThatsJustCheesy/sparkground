import { DynamicFnSignature, prettyPrintSignature } from "./dynamic-type";
import { ListValue, Value, prettyPrintValue } from "./value";

export type RuntimeError =
  | HoleEval
  | CallToNonFunction
  | DynamicSignatureMismatch
  | ImproperList
  | IndexOutOfBounds
  | WrongStructType
  | UnboundVariable
  | UninitializedVariable
  | CircularDependency;

export type HoleEval = {
  tag: "HoleEval";
};

export type CallToNonFunction = {
  tag: "CallToNonFunction";
  called: Value;
};

export type DynamicSignatureMismatch = {
  tag: "DynamicSignatureMismatch";
  argValues: Value[];
  signature: DynamicFnSignature;
};

export type ImproperList = {
  tag: "ImproperList";
  functionName: string;
  argValue?: Value;
};

export type IndexOutOfBounds = {
  tag: "IndexOutOfBounds";
  list: ListValue;
  index: number;
};

export type WrongStructType = {
  tag: "WrongStructType";
  structName: string;
};

export type UnboundVariable = {
  tag: "UnboundVariable";
  name: string;
};

export type UninitializedVariable = {
  tag: "UninitializedVariable";
  name: string;
};

export type CircularDependency = {
  tag: "CircularDependency";
  name: string;
};

export function describeRuntimeError(e: RuntimeError): string {
  switch (e.tag) {
    case "HoleEval":
      return `evaluating hole as expression`;
    case "CallToNonFunction":
      return `call to non-function: ${prettyPrintValue(e.called)}`;
    case "DynamicSignatureMismatch":
      return `call to function with arguments (${e.argValues
        .map(prettyPrintValue)
        .join(" ")}) is incompatible with the required signature (${prettyPrintSignature(
        e.signature
      )})`;
    case "ImproperList":
      return `argument ${
        e.argValue ? prettyPrintValue(e.argValue) : "[none]"
      } passed to built-in function \"${e.functionName}\" is an improper list`;
    case "IndexOutOfBounds":
      return `index ${e.index} is out of bounds for list ${prettyPrintValue(e.list)}`;
    case "WrongStructType":
      return `wrong structure type passed to field accessor for ${e.structName}`;
    case "UnboundVariable":
      return `no variable named \"${e.name}\" is bound here`;
    case "UninitializedVariable":
      return `the variable \"${e.name}\" is uninitialized`;
    case "CircularDependency":
      return `the variable \"${e.name}\" has a circular definition`;
  }
}
