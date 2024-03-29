import { FlattenedDatum, FlattenedListDatum, flattenDatum } from "../datum/flattened";
import { Parser as DatumParser } from "../datum/parse";
import { ForallType, Type, TypeVarSlot } from "./type";

export class Parser {
  static parseToType(source: string): Type {
    return new Parser().parseType(flattenDatum(DatumParser.parseToDatum(source)));
  }

  parseType(datum: FlattenedDatum): Type {
    switch (datum.kind) {
      case "Symbol":
        return datum.value.startsWith("#") ? { var: datum.value.slice(1) } : { tag: datum.value };

      case "Boolean":
        return { var: datum.value ? "t" : "f" };

      case "List":
        const tagDatum = datum.heads[0];
        if (tagDatum?.kind !== "Symbol") {
          throw "type arguments can only be applied to type constructor names";
        }
        const tag = tagDatum.value;

        if (tag === "All") {
          return this.parseForallType(datum);
        } else {
          const argData = datum.heads.slice(1);
          const args = argData.map((head) => this.parseType(head));

          return {
            tag,
            of: args,
          };
        }

      default:
        throw "invalid type expression";
    }
  }

  parseForallType(datum: FlattenedListDatum): ForallType {
    this.requireLength(datum, 3);

    const varsList = datum.heads[1]!;
    if (varsList.kind !== "List") {
      throw "expecting type variable list";
    }

    const forall: TypeVarSlot[] = varsList.heads.map((varDatum) => this.parseTypeVarSlot(varDatum));
    const body = this.parseType(datum.heads[2]!);

    return {
      forall,
      body,
    };
  }

  parseTypeVarSlot(datum: FlattenedDatum): TypeVarSlot {
    if (datum.kind === "Boolean") return { kind: "type-name-binding", id: datum.value ? "t" : "f" };

    if (datum.kind !== "Symbol") throw "expected identifier";

    if (datum.value === "·") return { kind: "type-name-hole" };
    return {
      kind: "type-name-binding",
      id: datum.value.startsWith("#") ? datum.value.slice(1) : datum.value,
    };
  }

  private requireLength(list: FlattenedListDatum, length: number) {
    if (list.heads.length !== length) {
      throw `expecting list of length ${length}, but actual length is ${list.heads.length}`;
    }
  }
}
