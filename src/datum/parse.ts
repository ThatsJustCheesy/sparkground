import { Datum, ListDatum } from "./datum";

export class Parser {
  static parseToDataWithComments(source: string): (Datum | Comment)[] {
    const parser = new Parser(tokenize(source));

    let data: (Datum | Comment)[] = [];
    while (parser.tokens.length) {
      data.push(parser.parseDatumOrComment());
    }

    return data;
  }

  static parseToData(source: string): Datum[] {
    const parser = new Parser(discardComments(tokenize(source)));

    let data: Datum[] = [];
    while (parser.tokens.length) {
      data.push(parser.parseDatum());
    }

    return data;
  }

  static parseToDatum(source: string): Datum {
    return new Parser(discardComments(tokenize(source))).parseDatum();
  }

  constructor(private tokens: Token[]) {}

  parseDatumOrComment(): Datum | Comment {
    const next = this.tokens[0];
    if (isComment(next)) {
      this.tokens.shift();
      return next;
    }
    return this.parseDatum();
  }

  parseDatum(): Datum {
    const next = this.tokens[0];
    if (next === undefined) throw "expected datum, but found end of input";

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
        return { kind: "Boolean", value: next === "#t" };
      case ".":
        throw `misplaced '.'`;
      default:
        this.tokens.shift();
        if (typeof next === "number") {
          return { kind: "Number", value: next };
        } else if ("string" in next) {
          return { kind: "String", value: next.string };
        } else if ("symbol" in next) {
          return { kind: "Symbol", value: next.symbol };
        } else {
          // Comment - should have been thrown away
          throw "comment token not allowed in this context";
        }
    }
  }

  parseList(): ListDatum {
    let heads: Datum[] = [];

    let next: Token;
    while ((next = this.tokens[0]!) != ")") {
      if (heads.length > 0 && next === ".") {
        // (head1 head2 ... headN . tail)

        // eat '.'
        this.tokens.shift();

        const tail = this.parseDatum();

        return {
          kind: "List",
          heads,
          tail,
        };
      } else {
        heads.push(this.parseDatum());
      }
    }

    // (head1 head2 ... headN)
    return {
      kind: "List",
      heads,
    };
  }

  private eat(required: Token): void {
    if (this.tokens.shift() !== required) throw `expected '${required}'`;
  }
}

export type Comment = {
  kind: "comment";
  text: string;
};

type Token =
  | "("
  | ")"
  | "#t"
  | "#f"
  | "."
  | number
  | { string: string }
  | { symbol: string }
  | Comment;

const constantTokens: (Token & string)[] = ["(", ")", "#t", "#f", "."];

function tokenize(source: string): Token[] {
  let tokens: Token[] = [];

  primary: while ((source = source.trimStart())) {
    if (source.startsWith(";")) {
      source = source.slice(1);

      let text = "";
      while (source.length && !source.startsWith("\n")) {
        text += source[0];
        source = source.slice(1);
      }

      tokens.push({ kind: "comment", text });
      continue;
    }

    for (const token of constantTokens) {
      if (source.startsWith(token)) {
        source = source.slice(token.length);
        tokens.push(token);
        continue primary;
      }
    }

    if (source.startsWith('"')) {
      source = source.slice(1);

      let string = "";
      let char = source[0];
      let escape = false;

      while (escape || char !== '"') {
        if (!source.length) throw "unterminated string literal";

        escape = !escape && char === "\\";
        if (!escape) {
          string += char;
        }

        source = source.slice(1);
        char = source[0];
      }

      // Consume ending quotes
      source = source.slice(1);

      tokens.push({ string });
      continue;
    }

    // TODO: Real number parsing
    let match = source.match(/^-?\d+/);
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

function isComment(token: Token | undefined): token is Comment {
  return typeof token === "object" && "kind" in token && token.kind === "comment";
}

function discardComments(tokens: Token[]): Token[] {
  return tokens.filter((token) => !isComment(token));
}
