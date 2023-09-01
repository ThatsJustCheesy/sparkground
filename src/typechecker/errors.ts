import { Var, Expr, Call } from "./ast/ast";
import { serializeType } from "./serialize";
import { InferrableType } from "./type";

export type InferenceError = UnboundVariable | TypeMismatch | ArityMismatch | OccursCheckFailure;

export type UnboundVariable = {
  tag: "UnboundVariable";
  v: Var;
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
    case "TypeMismatch":
      return `type mismatch: ${serializeType(e.t1)}, ${serializeType(e.t2)}`;
    case "ArityMismatch":
      return `wrong number of arguments: got ${e.attemptedCallArity}, expecting ${e.arity}`;
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
    case "TypeMismatch":
      return expr === e.e1 || expr === e.e2;
    case "ArityMismatch":
      return expr === e.call;
    case "OccursCheckFailure":
      return expr === e.e1 || expr === e.e2;
  }
}
