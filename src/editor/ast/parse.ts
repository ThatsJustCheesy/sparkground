import {
  Cond,
  Define,
  Expr,
  If,
  Lambda,
  Let,
  Call,
  Sequence,
  Var,
  NameBinding,
  NullExpr,
} from "../../typechecker/ast/ast";
import { hole } from "./ast";

export class Parser {
  static parseToExprs(source: string) {
    const parser = new Parser(tokenize(source));
    let exprs: Expr[] = [];
    while (parser.tokens.length) {
      exprs.push(parser.parsePrimary());
    }
    return exprs;
  }

  static parseToExpr(source: string): Expr {
    return new Parser(tokenize(source)).parsePrimary();
  }

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
            return this.parseCall();
        }
      case ")":
        throw "extraneous ')'";
      case "#t":
      case "#f":
        this.tokens.shift();
        return { kind: "bool", value: next === "#t" };
      case "'":
        return this.parseQuoted();
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

  parseCall(): Call {
    this.eat("(");

    const exprs: Expr[] = [];
    while (this.tokens.length && this.tokens[0] !== ")") {
      exprs.push(this.parsePrimary());
    }

    this.eat(")");

    const [called, ...args] = exprs;
    return {
      kind: "call",
      called,
      args,
    };
  }

  parseDefine(): Define {
    this.eat("(");
    this.eat("define");

    const name = this.parseNameBinding();
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

    let bindings: [name: NameBinding, value: Expr][] = [];
    while (this.tokens[0] !== ")") {
      this.eat("(");

      const name = this.parseNameBinding();
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

    let params: NameBinding[] = [];
    while (this.tokens[0] !== ")") {
      params.push(this.parseNameBinding());
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

  parseNameBinding(): NameBinding {
    return { kind: "name-binding", id: this.parseVar().id };
  }

  private eat(required: Token): void {
    if (this.tokens.shift() !== required) throw `expected '${required}'`;
  }

  parseQuoted(): NullExpr {
    this.eat("'");
    this.eat("(");

    if (this.tokens[0] === ")") {
      this.eat(")");
      return { kind: "null" };
    }

    // TODO: Reenable this
    throw "TODO";
    // return { quote: this.parseCall(tokens) };
  }
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
    let match = source.match(/^\d+/);
    if (match) {
      const [matchText] = match;
      source = source.slice(matchText.length);
      tokens.push(Number(matchText));
      continue;
    }

    match = source.match(/^[a-zA-Z!$%&*\/:<=>?^_~][a-zA-Z!$%&*\/:<=>?^_~0-9+\-\.@]*|\+|\-|\.\.\./);
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
