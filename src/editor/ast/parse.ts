import {
  Cond,
  Define,
  Expr,
  If,
  Lambda,
  Let,
  SExpr,
  Sequence,
  Var,
} from "../../typechecker/ast/ast";
import { hole } from "./ast";

export function parseToExpr(source: string): Expr {
  return new Parser(tokenize(source)).parsePrimary();
}

class Parser {
  constructor(private tokens: Token[] = []) {}

  parsePrimary(): Expr {
    if (!this.tokens.length) throw "expected expression, but found end of input";

    const next = this.tokens[0];
    switch (next) {
      case "(":
        switch (this.tokens[1]) {
          case "define":
            return this.parseDefine();
          case "let":
            return this.parseLet();
          case "lambda":
            return this.parseLambda();
          case "if":
            return this.parseIf();
          case "cond":
            return this.parseCond();
          default:
            return this.parseSExpr();
        }
      case ")":
        throw "extraneous ')'";
      case "#t":
      case "#f":
        this.tokens.shift();
        return { kind: "bool", value: next === "#t" };
      case "'":
        throw "TODO";
      // return this.parseQuoted(tokens);
      case "define":
      case "let":
      case "lambda":
      case "if":
      case "cond":
        throw `misplaced keyword '${next}'`;
      default:
        this.tokens.shift();
        if (typeof next === "number") return { kind: "number", value: next };
        if (next.identifier === "_") return hole;
        return { kind: "var", id: next.identifier };
    }
  }

  parseSExpr(): SExpr {
    this.eat("(");

    const exprs: Expr[] = [];
    while (this.tokens.length && this.tokens[0] !== ")") {
      exprs.push(this.parsePrimary());
    }

    this.eat(")");

    const [called, ...args] = exprs;
    return {
      kind: "sexpr",
      called,
      args,
    };
  }

  parseDefine(): Define {
    this.eat("(");
    this.eat("define");

    const name = this.parseVar();
    const value = this.parsePrimary();

    this.eat(")");

    return {
      kind: "define",
      name,
      value,
    };
  }

  parseLet(): Let {
    this.eat("(");
    this.eat("let");

    this.eat("(");

    let bindings: [name: Var, value: Expr][] = [];
    while (this.tokens[0] !== ")") {
      this.eat("(");

      const name = this.parseVar();
      const value = this.parsePrimary();

      bindings.push([name, value]);

      this.eat(")");
    }

    this.eat(")");

    const body = this.parsePrimary();

    this.eat(")");

    return {
      kind: "let",
      bindings,
      body,
    };
  }

  parseLambda(): Lambda {
    this.eat("(");
    this.eat("lambda");

    this.eat("(");

    let params: Var[] = [];
    while (this.tokens[0] !== ")") {
      params.push(this.parseVar());
    }

    this.eat(")");

    const body = this.parseSequence();

    this.eat(")");

    return {
      kind: "lambda",
      params,
      body,
    };
  }

  parseSequence(): Sequence {
    let exprs: Expr[] = [];
    while (this.tokens[0] !== ")") {
      exprs.push(this.parsePrimary());
    }
    return { kind: "sequence", exprs };
  }

  parseIf(): If {
    this.eat("(");
    this.eat("if");

    const if_ = this.parsePrimary();
    const then = this.parsePrimary();
    const else_ = this.parsePrimary();

    this.eat(")");

    return {
      kind: "if",
      if: if_,
      then,
      else: else_,
    };
  }

  parseCond(): Cond {
    this.eat("(");
    this.eat("cond");

    this.eat("(");

    let cases: [condition: Expr, value: Expr][] = [];
    while (this.tokens[0] !== ")") {
      this.eat("(");

      const condition = this.parsePrimary();
      const value = this.parsePrimary();

      cases.push([condition, value]);

      this.eat(")");
    }

    this.eat(")");
    this.eat(")");

    return {
      kind: "cond",
      cases,
    };
  }

  parseVar(): Var {
    const identifierToken = this.tokens.shift();
    if (typeof identifierToken !== "object") throw "expected identifier";
    return { kind: "var", id: identifierToken.identifier };
  }

  eat(required: Token): void {
    if (this.tokens.shift() !== required) throw `expected '${required}'`;
  }

  // TODO: Reenable this
  // parseQuoted(tokens: Token[]): QuoteLiteral {
  //   tokens.shift(); // '

  //   const [first, second] = tokens;

  //   if (!(first && second && first === "(")) throw "invalid quoted expression";

  //   if (second === ")") return null;

  //   return { quote: this.parseSExpr(tokens) };
  // }
}

type Token =
  | "("
  | ")"
  | "#t"
  | "#f"
  | "'"
  | number
  | "define"
  | "let"
  | "lambda"
  | "if"
  | "cond"
  | { identifier: string };

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

      tokens.push(
        (() => {
          switch (matchText) {
            case "define":
            case "let":
            case "lambda":
            case "if":
            case "cond":
              return matchText;
            default:
              return { identifier: matchText };
          }
        })()
      );

      continue;
    }
  }

  return tokens;
}
