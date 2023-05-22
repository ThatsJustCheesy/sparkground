import {
  Expr,
  isBoolLiteral,
  isHole,
  isNumericLiteral,
  isProgSymbol,
  isQuoteLiteral,
  isSExpr,
} from "./ast";

export function serializeExpr(expr: Expr): string {
  if (isSExpr(expr)) {
    return (
      "(" +
      serializeExpr(expr.called) +
      (expr.args.length ? " " + expr.args.map(serializeExpr).join(" ") : "") +
      ")"
    );
  }

  if (isProgSymbol(expr)) return expr.id;
  if (isNumericLiteral(expr)) return `${expr}`;
  if (isBoolLiteral(expr)) return expr ? "#t" : "#f";
  if (isQuoteLiteral(expr)) return expr === null ? "'()" : "'(" + serializeExpr(expr.quote) + ")";
  if (isHole(expr)) return "<...>";
  throw "invalid expression";
}
