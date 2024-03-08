import { Var, Expr, Call, NameBinding } from "../expr/expr";
import { serializeType } from "./serialize";
import { Type } from "./type";

export type InferenceError =
  | UnboundVariable
  | CircularDependency
  | NotCallable
  | InvalidAssignment
  | ArityMismatch
  | VariadicArityMismatch;

export type UnboundVariable = {
  tag: "UnboundVariable";
  v: Var | NameBinding;
};

export type CircularDependency = {
  tag: "CircularDependency";
  v: Var | NameBinding;
};

export type NotCallable = {
  tag: "NotCallable";
  call: Call;
  calledType: Type;
};

export type InvalidAssignment = {
  tag: "InvalidAssignment";
  expr: Expr;
  type: Type;
};

export type ArityMismatch = {
  tag: "ArityMismatch";
  call: Call;
  calledType: Type;
  arity: number;
  attemptedCallArity: number;
};

export type VariadicArityMismatch = {
  tag: "VariadicArityMismatch";
  call: Call;
  calledType: Type;
  minArity?: number;
  maxArity?: number;
  attemptedCallArity: number;
};

export function describeInferenceError(e: InferenceError): string {
  switch (e.tag) {
    case "UnboundVariable":
      return `unbound variable: ${e.v.id}`;
    case "CircularDependency":
      return `circular type dependency for variable: ${e.v.id}`;
    case "NotCallable":
      return `expression type is not callable: ${serializeType(e.calledType)}`;
    case "InvalidAssignment":
      return `invalid assignment to type ${serializeType(e.type)}`;
    case "ArityMismatch":
      return `wrong number of arguments: got ${e.attemptedCallArity}, expecting ${e.arity}`;
    case "VariadicArityMismatch":
      return !e.minArity
        ? `wrong number of arguments: got ${e.attemptedCallArity}, expecting at most ${e.maxArity}`
        : !e.maxArity
        ? `wrong number of arguments: got ${e.attemptedCallArity}, expecting at least ${e.minArity}`
        : `wrong number of arguments: got ${e.attemptedCallArity}, expecting between ${e.minArity} and ${e.maxArity}`;
  }
}

export function errorInvolvesExpr(e: InferenceError, expr: Expr): boolean {
  switch (e.tag) {
    case "UnboundVariable":
    case "CircularDependency":
      return expr === e.v;
    case "InvalidAssignment":
      return expr === e.expr;
    case "NotCallable":
      return expr === e.call;
    case "ArityMismatch":
    case "VariadicArityMismatch":
      return expr === e.call;
  }
}
