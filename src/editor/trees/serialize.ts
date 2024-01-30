import { Expr, getIdentifier } from "../../expr/expr";
import { serializeDatum } from "../../datum/serialize";
import { isHole } from "./tree";
import { serializeAttributes } from "../../expr/attributes";

export function serializeExprWithAttributes(expr: Expr): string {
  return (
    (expr.attributes ? `; ${serializeAttributes(expr.attributes)}\n` : "") + serializeExpr(expr)
  );
}

export function serializeExpr(expr: Expr): string {
  switch (expr.kind) {
    // Datum
    case "bool":
    case "number":
    case "string":
      return serializeDatum(expr);

    case "symbol":
    case "list":
      if (isHole(expr)) return "·";
      return `(quote ${serializeDatum(expr)})`;

    // Expr
    case "name-binding":
    case "var":
      return expr.id;
    case "call":
      return (
        "(" +
        serializeExpr(expr.called) +
        (expr.args.length ? " " + expr.args.map(serializeExpr).join(" ") : "") +
        ")"
      );
    case "define":
      return "(define " + getIdentifier(expr.name) + " " + serializeExpr(expr.value) + ")";
    case "let":
    case "letrec":
      return (
        "(" +
        expr.kind +
        " (" +
        expr.bindings.map(
          ([name, valueExpr]) => "(" + getIdentifier(name) + " " + serializeExpr(valueExpr) + ")"
        ) +
        ") " +
        serializeExpr(expr.body) +
        ")"
      );
    case "lambda":
      return (
        "(lambda (" +
        expr.params.map(getIdentifier).join(" ") +
        ") " +
        serializeExpr(expr.body) +
        ")"
      );
    case "sequence":
      return expr.exprs.map(serializeExpr).join(" ");
    case "if":
      return (
        "(if " +
        serializeExpr(expr.if) +
        " " +
        serializeExpr(expr.then) +
        " " +
        serializeExpr(expr.else) +
        ")"
      );
    case "cond":
      return (
        "(cond (" +
        expr.cases.map(
          ([condition, value]) => serializeExpr(condition) + " " + serializeExpr(value)
        ) +
        "))"
      );
  }
}
