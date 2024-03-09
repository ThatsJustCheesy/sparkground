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
  Letrec,
  TypeExpr,
  VarSlot,
} from "./expr";
import { FlattenedDatum, FlattenedListDatum, flattenDatum } from "../datum/flattened";
import { Parser as DatumParser } from "../datum/parse";
import { hole } from "../editor/trees/tree";
import { DefinitionAttributes, parseAttributes } from "./attributes";
import { Parser as TypeParser } from "../typechecker/parse";
import { merge } from "lodash";
import { Type } from "../typechecker/type";

export class Parser {
  static parseToExprsWithAttributes(source: string) {
    const parser = new Parser();
    return DatumParser.parseToDataWithComments(source).flatMap((datum) => {
      if (datum.kind === "comment") {
        parser.nextAttributes = parseAttributes(datum.text);
        return [];
      }
      return [parser.parsePrimary(flattenDatum(datum))];
    });
  }

  static parseToExprs(source: string) {
    const parser = new Parser();
    return DatumParser.parseToData(source).map((datum) => parser.parsePrimary(flattenDatum(datum)));
  }

  static parseToExpr(source: string): Expr {
    return new Parser().parsePrimary(flattenDatum(DatumParser.parseToDatum(source)));
  }

  private nextAttributes?: DefinitionAttributes;

  parsePrimary(datum: FlattenedDatum): Expr {
    const attributes = this.nextAttributes;
    this.nextAttributes = undefined;

    const primary = this.#parsePrimary(datum);

    return attributes !== undefined ? merge({ attributes }, primary) : primary;
  }

  #parsePrimary(datum: FlattenedDatum): Expr {
    switch (datum.kind) {
      case "Boolean":
      case "Number":
      case "String":
        return datum;

      case "Symbol":
        const symbol = datum.value;
        switch (symbol) {
          case "quote":
          case "type":
          case "define":
          case "let":
          case "letrec":
          case "lambda":
          case "if":
          case "cond":
            throw `misplaced keyword '${symbol}'`;
          default:
            if (symbol === "·") return hole;
            return { kind: "var", id: symbol };
        }

      case "List":
        const called = datum.heads[0]!;
        if (called.kind === "Symbol") {
          // Determine which syntactic keyword this is, if any

          switch (called.value) {
            case "type":
              return this.parseTypeExpr(datum);
            case "define":
              return this.parseDefine(datum);
            case "let":
              return this.parseLet(datum);
            case "letrec":
              return this.parseLetrec(datum);
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
        return datum.value;
    }
  }

  parseCall(datum: FlattenedListDatum): Call {
    const [called, ...args] = datum.heads.map((head) => this.parsePrimary(head));
    return {
      kind: "call",
      called: called!,
      args,
    };
  }

  parseTypeExpr(datum: FlattenedListDatum): TypeExpr {
    this.requireLength(datum, 2);

    return {
      kind: "type",
      type: this.parseType(datum.heads[1]!),
    };
  }

  parseType(datum: FlattenedDatum): Type {
    return new TypeParser().parseType(datum);
  }

  parseDefine(datum: FlattenedListDatum): Define {
    this.requireLength(datum, 3);

    const name = this.parseVarSlot(datum.heads[1]!);
    const value = this.parsePrimary(datum.heads[2]!);

    return {
      kind: "define",
      name,
      value,
    };
  }

  parseLet(datum: FlattenedListDatum): Let {
    this.requireLength(datum, 3);

    const bindingList = datum.heads[1]!;
    if (bindingList.kind !== "List") {
      throw "expecting binding list";
    }

    const bindings: [name: VarSlot, value: Expr][] = bindingList.heads.map((binding) => {
      if (binding.kind !== "List") {
        throw "expecting binding";
      }
      this.requireLength(binding, 2);

      const name = this.parseVarSlot(binding.heads[0]!);
      const value = this.parsePrimary(binding.heads[1]!);

      return [name, value];
    });

    const body = this.parsePrimary(datum.heads[2]!);

    return {
      kind: "let",
      bindings,
      body,
    };
  }

  parseLetrec(datum: FlattenedListDatum): Letrec {
    return { ...this.parseLet(datum), kind: "letrec" };
  }

  parseLambda(datum: FlattenedListDatum): Lambda {
    this.requireLength(datum, 3);

    const bindingList = datum.heads[1]!;
    if (bindingList.kind !== "List") {
      throw "expecting binding list";
    }

    const params: VarSlot[] = bindingList.heads.map((name) => this.parseVarSlot(name));
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

    const if_ = this.parsePrimary(datum.heads[1]!);
    const then = this.parsePrimary(datum.heads[2]!);
    const else_ = this.parsePrimary(datum.heads[3]!);

    return {
      kind: "if",
      if: if_,
      then,
      else: else_,
    };
  }

  parseCond(datum: FlattenedListDatum): Cond {
    this.requireLength(datum, 2);

    const caseList = datum.heads[1]!;
    if (caseList.kind !== "List") {
      throw "expecting cond case list";
    }

    const cases: [condition: Expr, value: Expr][] = caseList.heads.map((case_) => {
      if (case_.kind !== "List") {
        throw "expecting cond case";
      }
      this.requireLength(case_, 2);

      const condition = this.parsePrimary(case_.heads[0]!);
      const value = this.parsePrimary(case_.heads[1]!);

      return [condition, value];
    });

    return {
      kind: "cond",
      cases,
    };
  }

  parseVar(datum: FlattenedDatum): Var {
    if (datum.kind !== "Symbol") throw "expected identifier";
    return { kind: "var", id: datum.value };
  }

  parseVarSlot(datum: FlattenedDatum): VarSlot {
    let id: string;
    let type: Type | undefined;

    if (datum.kind === "List") {
      if (datum.heads.length > 2) {
        throw `expecting list of length ${length}, but actual length is ${datum.heads.length}`;
      }
      id = this.parseVar(datum.heads[0]!).id;
      if (datum.heads.length >= 2) type = this.parseType(datum.heads[1]!);
    } else {
      id = this.parseVar(datum).id;
    }

    if (id === hole.value) return hole;
    if (type) return { kind: "name-binding", id, type };
    return { kind: "name-binding", id };
  }

  private requireLength(list: FlattenedListDatum, length: number) {
    if (list.heads.length !== length) {
      throw `expecting list of length ${length}, but actual length is ${list.heads.length}`;
    }
  }
}
