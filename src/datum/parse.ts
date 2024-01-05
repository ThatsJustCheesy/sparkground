import { Datum, ListDatum } from "./datum";

export class Parser {
  static parseToData(source: string): Datum[] {
    const parser = new Parser(tokenize(source));
    let data: Datum[] = [];
    while (parser.tokens.length) {
      data.push(parser.parseDatum());
    }
    return data;
  }

  static parseToDatum(source: string): Datum {
    return new Parser(tokenize(source)).parseDatum();
  }

  constructor(private tokens: Token[]) {}

  parseDatum(): Datum {
    if (!this.tokens.length) throw "expected datum, but found end of input";

    const next = this.tokens[0];
    switch (next) {
      case "(":
        this.eat("(");
        const list = this.parseList();
        this.eat(")");
        return list;
      case ")":
        throw "extraneous ')'";
      case "#t":
      case "#f":
        this.tokens.shift();
        return { kind: "bool", value: next === "#t" };
      case ".":
        throw `misplaced '.'`;
      default:
        this.tokens.shift();
        if (typeof next === "number") {
          return { kind: "number", value: next };
        } else {
          return { kind: "symbol", value: next.symbol };
        }
    }
  }

  parseList(): ListDatum {
    let heads: Datum[] = [];

    let next: Token;
    while ((next = this.tokens[0]) != ")") {
      if (heads.length > 0 && next === ".") {
        // (head1 head2 ... headN . tail)

        // eat '.'
        this.tokens.shift();

        const tail = this.parseDatum();

        return {
          kind: "list",
          heads,
          tail,
        };
      } else {
        heads.push(this.parseDatum());
      }
    }

    // (head1 head2 ... headN)
    return {
      kind: "list",
      heads,
    };
  }

  private eat(required: Token): void {
    if (this.tokens.shift() !== required) throw `expected '${required}'`;
  }
}

type Token = "(" | ")" | "#t" | "#f" | "." | number | { symbol: string };

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
    if (source.startsWith(".")) {
      source = source.slice(1);
      tokens.push(".");
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

    match = source.match(
      /^·|[a-zA-Z!$%&*\/:<=>?^_~][a-zA-Z!$%&*\/:<=>?^_~0-9+\-\.@]*|\+|\-|\.\.\./
    );
    if (match) {
      const [symbol] = match;
      source = source.slice(symbol.length);

      tokens.push({ symbol });
      continue;
    }

    throw "invalid token in source code";
  }

  return tokens;
}
