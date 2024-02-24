import { Var, Expr, Call, NameBinding } from "../expr/expr";
import { serializeType } from "./serialize";
import { InferrableType, Type } from "./type";

export type InferenceError =
  | UnboundVariable
  | NotCallable
  | InvalidAssignment
  | TypeMismatch
  | ArityMismatch
  | VariadicArityMismatch
  | OccursCheckFailure;

export type UnboundVariable = {
  tag: "UnboundVariable";
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
  type: InferrableType;
};

export type TypeMismatch = {
  tag: "TypeMismatch";
  e1: Expr;
  e2: Expr;
  t1: InferrableType;
  t2: InferrableType;
};

export type ArityMismatch = {
  tag: "ArityMismatch";
  call: Call;
  calledType: InferrableType;
  arity: number;
  attemptedCallArity: number;
};

export type VariadicArityMismatch = {
  tag: "VariadicArityMismatch";
  call: Call;
  calledType: InferrableType;
  minArity?: number;
  maxArity?: number;
  attemptedCallArity: number;
};

export type OccursCheckFailure = {
  tag: "OccursCheckFailure";
  e1: Expr;
  e2: Expr;
  t1: InferrableType;
  t2: InferrableType;
};

export function describeInferenceError(e: InferenceError): string {
  switch (e.tag) {
    case "UnboundVariable":
      return `unbound variable: ${e.v.id}`;
    case "NotCallable":
      return `expression type is not callable: ${serializeType(e.calledType)}`;
    case "InvalidAssignment":
      return `invalid assignment to type ${serializeType(e.type)}`;
    case "TypeMismatch":
      return `type mismatch: ${serializeType(e.t1)}, ${serializeType(e.t2)}`;
    case "ArityMismatch":
      return `wrong number of arguments: got ${e.attemptedCallArity}, expecting ${e.arity}`;
    case "VariadicArityMismatch":
      return !e.minArity
        ? `wrong number of arguments: got ${e.attemptedCallArity}, expecting at most ${e.maxArity}`
        : !e.maxArity
        ? `wrong number of arguments: got ${e.attemptedCallArity}, expecting at least ${e.minArity}`
        : `wrong number of arguments: got ${e.attemptedCallArity}, expecting between ${e.minArity} and ${e.maxArity}`;
    case "OccursCheckFailure":
      return `inferred type is circular: unifying ${serializeType(e.t1)} with ${serializeType(
        e.t2
      )}, but the former is used in the latter`;
  }
}

export function errorInvolvesExpr(e: InferenceError, expr: Expr): boolean {
  switch (e.tag) {
    case "UnboundVariable":
      return expr === e.v;
    case "InvalidAssignment":
      return expr === e.expr;
    case "NotCallable":
      return expr === e.call;
    case "TypeMismatch":
      return expr === e.e1 || expr === e.e2;
    case "ArityMismatch":
    case "VariadicArityMismatch":
      return expr === e.call;
    case "OccursCheckFailure":
      return expr === e.e1 || expr === e.e2;
  }
}
