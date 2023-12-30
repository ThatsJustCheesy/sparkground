import { Expr, getIdentifier } from "../../expr/expr";
import { serializeDatum } from "../../datum/serialize";
import { Datum } from "../../datum/datum";

export function serializeExpr(expr: Expr | Datum): string {
  switch (expr.kind) {
    // Datum
    case "bool":
    case "number":
    case "string":
    case "symbol":
    case "list":
      return serializeDatum(expr);

    // Expr
    case "quote":
      return `(quote ${serializeDatum(expr.value)})`;
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
      return (
        "(let (" +
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
