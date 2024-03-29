import { Var, Expr, Call, NameBinding, Define } from "../expr/expr";
import { serializeType } from "./serialize";
import { Type } from "./type";

export type InferenceError =
  | DuplicateDefinition
  | UnboundVariable
  | NotCallable
  | InvalidAssignmentToType
  | InvalidAssignment
  | ArityMismatch
  | VariadicArityMismatch;

export type DuplicateDefinition = {
  tag: "DuplicateDefinition";
  define: Define;
  id: string;
};

export type UnboundVariable = {
  tag: "UnboundVariable";
  v: Var | NameBinding;
};

export type NotCallable = {
  tag: "NotCallable";
  call: Call;
  calledType: Type;
};

export type InvalidAssignmentToType = {
  tag: "InvalidAssignmentToType";
  expr: Expr;
  type: Type;
};

export type InvalidAssignment = {
  tag: "InvalidAssignment";
  expr: Expr;
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
    case "DuplicateDefinition":
      return `duplicate definition of ${e.id}`;
    case "UnboundVariable":
      return `unbound variable: ${e.v.id}`;
    case "NotCallable":
      return `expression type is not callable: ${serializeType(e.calledType)}`;
    case "InvalidAssignmentToType":
      return `invalid assignment to type ${serializeType(e.type)}`;
    case "InvalidAssignment":
      return `invalid assignment`;
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
    case "DuplicateDefinition":
      return expr === e.define;
    case "UnboundVariable":
      return expr === e.v;
    case "InvalidAssignmentToType":
    case "InvalidAssignment":
      return expr === e.expr;
    case "NotCallable":
      return expr === e.call;
    case "ArityMismatch":
    case "VariadicArityMismatch":
      return expr === e.call;
  }
}
