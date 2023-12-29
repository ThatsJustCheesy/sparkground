import {
  Define,
  Expr,
  Let,
  Call,
  NameBinding,
  Lambda,
  Sequence,
  If,
  Cond,
  Var,
  QuoteExpr,
} from "./expr";
import { FlattenedDatum, FlattenedListDatum, flattenDatum } from "../datum/flattened";
import { Parser as DatumParser } from "../datum/parse";
import { hole } from "../editor/trees/tree";

export class Parser {
  static parseToExprs(source: string) {
    const parser = new Parser();
    return DatumParser.parseToData(source).map((datum) => parser.parsePrimary(flattenDatum(datum)));
  }

  static parseToExpr(source: string): Expr {
    return new Parser().parsePrimary(flattenDatum(DatumParser.parseToDatum(source)));
  }

  parsePrimary(datum: FlattenedDatum): Expr {
    switch (datum.kind) {
      case "bool":
      case "number":
      case "string":
        return datum;

      case "symbol":
        const symbol = datum.value;
        switch (symbol) {
          case "quote":
          case "define":
          case "let":
          case "lambda":
          case "if":
          case "cond":
            throw `misplaced keyword '${symbol}'`;
          default:
            if (symbol === "_") return hole;
            return { kind: "var", id: symbol };
        }

      case "list":
        const called = datum.heads[0];
        if (called.kind === "symbol") {
          // Determine which syntactic keyword this is, if any

          switch (called.value) {
            case "define":
              return this.parseDefine(datum);
            case "let":
              return this.parseLet(datum);
            case "lambda":
              return this.parseLambda(datum);
            case "if":
              return this.parseIf(datum);
            case "cond":
              return this.parseCond(datum);
            default:
              return this.parseCall(datum);
          }
        }

        return {
          kind: "call",
          called: this.parsePrimary(called),
          args: datum.heads.slice(1).map((head) => this.parsePrimary(head)),
        };

      case "quote":
        return datum satisfies QuoteExpr;
    }
  }

  parseCall(datum: FlattenedListDatum): Call {
    const [called, ...args] = datum.heads.map((head) => this.parsePrimary(head));
    return {
      kind: "call",
      called,
      args,
    };
  }

  parseDefine(datum: FlattenedListDatum): Define {
    this.requireLength(datum, 3);

    const name = this.parseNameBinding(datum.heads[1]);
    const value = this.parsePrimary(datum.heads[2]);

    return {
      kind: "define",
      name,
      value,
    };
  }

  parseLet(datum: FlattenedListDatum): Let {
    this.requireLength(datum, 3);

    const bindingList = datum.heads[1];
    if (bindingList.kind !== "list") {
      throw "expecting binding list";
    }

    const bindings: [name: NameBinding, value: Expr][] = bindingList.heads.map((binding) => {
      if (binding.kind !== "list") {
        throw "expecting binding";
      }
      this.requireLength(binding, 2);

      const name = this.parseNameBinding(binding.heads[0]);
      const value = this.parsePrimary(binding.heads[1]);

      return [name, value];
    });

    const body = this.parsePrimary(datum.heads[2]);

    return {
      kind: "let",
      bindings,
      body,
    };
  }

  parseLambda(datum: FlattenedListDatum): Lambda {
    this.requireLength(datum, 3);

    const bindingList = datum.heads[1];
    if (bindingList.kind !== "list") {
      throw "expecting binding list";
    }

    const params: NameBinding[] = bindingList.heads.map((name) => this.parseNameBinding(name));
    const body = this.parseSequence(datum.heads.slice(2));

    return {
      kind: "lambda",
      params,
      body,
    };
  }

  parseSequence(heads: FlattenedDatum[]): Sequence {
    const exprs = heads.map((head) => this.parsePrimary(head));
    return { kind: "sequence", exprs };
  }

  parseIf(datum: FlattenedListDatum): If {
    this.requireLength(datum, 4);

    const if_ = this.parsePrimary(datum.heads[1]);
    const then = this.parsePrimary(datum.heads[2]);
    const else_ = this.parsePrimary(datum.heads[3]);

    return {
      kind: "if",
      if: if_,
      then,
      else: else_,
    };
  }

  parseCond(datum: FlattenedListDatum): Cond {
    this.requireLength(datum, 2);

    const caseList = datum.heads[1];
    if (caseList.kind !== "list") {
      throw "expecting cond case list";
    }

    const cases: [condition: Expr, value: Expr][] = caseList.heads.map((case_) => {
      if (case_.kind !== "list") {
        throw "expecting cond case";
      }
      this.requireLength(case_, 2);

      const condition = this.parsePrimary(case_.heads[0]);
      const value = this.parsePrimary(case_.heads[1]);

      return [condition, value];
    });

    return {
      kind: "cond",
      cases,
    };
  }

  parseVar(datum: FlattenedDatum): Var {
    if (datum.kind !== "symbol") throw "expected identifier";
    return { kind: "var", id: datum.value };
  }

  parseNameBinding(datum: FlattenedDatum): NameBinding {
    return { kind: "name-binding", id: this.parseVar(datum).id };
  }

  private requireLength(list: FlattenedListDatum, length: number) {
    if (list.heads.length !== length) {
      throw `expecting list of length ${length}, but actual length is ${list.heads.length}`;
    }
  }
}
