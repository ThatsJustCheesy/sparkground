import { BoolLiteral, Expr, QuoteLiteral, SExpr } from "./ast";
import { SymbolTable } from "../symbol-table";

export function parseToExpr(source: string): Expr {
  return new Parser().parsePrimary(tokenize(source));
}

class Parser {
  #symbolTable = new SymbolTable();

  parsePrimary(tokens: Token[]): Expr {
    if (!tokens.length) throw "expected expression, but found end of input";

    const next = tokens[0];
    switch (next) {
      case "(":
        return this.parseSExpr(tokens);
      case ")":
        throw "extraneous ')'";
      case "#t":
      case "#f":
        tokens.shift();
        return next === "#t";
      case "'":
        return this.parseQuoted(tokens);
      default:
        tokens.shift();
        if (typeof next === "number") return { n: next };
        return this.#symbolTable.get(next.identifier);
    }
  }

  parseSExpr(tokens: Token[]): SExpr {
    tokens.shift(); // (

    const exprs: Expr[] = [];
    while (tokens.length && tokens[0] !== ")") {
      exprs.push(this.parsePrimary(tokens));
    }

    if (tokens[0] !== ")") throw "missing ')'";
    tokens.shift(); // )

    return {
      called: exprs[0],
      args: exprs.slice(1),
    };
  }

  parseQuoted(tokens: Token[]): QuoteLiteral {
    tokens.shift(); // '

    const [first, second] = tokens;

    if (!(first && second && first === "(")) throw "invalid quoted expression";

    if (second === ")") return null;

    return { quote: this.parseSExpr(tokens) };
  }
}

type Token = "(" | ")" | "#t" | "#f" | "'" | number | { identifier: string };

function tokenize(source: string): Token[] {
  let tokens: Token[] = [];

  while (source.length) {
    source = source.trimStart();

    if (source.startsWith("(")) {
      source = source.slice(1);
      tokens.push("(");
      continue;
    }
    if (source.startsWith(")")) {
      source = source.slice(1);
      tokens.push(")");
      continue;
    }
    if (source.startsWith("#t")) {
      source = source.slice(2);
      tokens.push("#t");
      continue;
    }
    if (source.startsWith("#f")) {
      source = source.slice(2);
      tokens.push("#f");
      continue;
    }
    if (source.startsWith("'")) {
      source = source.slice(1);
      tokens.push("'");
      continue;
    }

    // TODO: Real number parsing
    let match = source.match(/^\d+(\s|$)/);
    if (match) {
      const [matchText] = match;
      source = source.slice(matchText.length);
      tokens.push(Number(matchText));
      continue;
    }

    match = source.match(/^[^\s()']+/);
    if (match) {
      const [matchText] = match;
      source = source.slice(matchText.length);
      tokens.push({ identifier: match[0] });
      continue;
    }
  }

  return tokens;
}
