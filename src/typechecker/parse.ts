import { FlattenedDatum, flattenDatum } from "../datum/flattened";
import { Parser as DatumParser } from "../datum/parse";
import { Type, isTypeVar } from "./type";

export class Parser {
  static parseToType(source: string): Type {
    return new Parser().parseType(flattenDatum(DatumParser.parseToDatum(source)));
  }

  parseType(datum: FlattenedDatum): Type {
    switch (datum.kind) {
      case "symbol":
        return { tag: datum.value };

      case "list":
        const tagDatum = datum.heads[0];
        if (tagDatum?.kind !== "symbol") {
          throw "type arguments can only be applied to type constructor names";
        }
        const tag = tagDatum.value;

        const argData = datum.heads.slice(1);
        const args = argData.map((head) => this.parseType(head));

        return {
          tag,
          of: args,
        };

      default:
        throw "invalid type expression";
    }
  }
}
