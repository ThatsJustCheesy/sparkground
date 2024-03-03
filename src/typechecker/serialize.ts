import {
  Type,
  isForallType,
  isTypeNameBinding,
  isTypeNameHole,
  isTypeVar,
  typeParams,
} from "./type";

export function serializeType(t: Type): string {
  if (isTypeVar(t)) {
    return t.var;
  } else if (isTypeNameBinding(t)) {
    return t.id;
  } else if (isTypeNameHole(t)) {
    return "·";
  } else if (isForallType(t)) {
    return "(All (" + t.forall.map(serializeType).join(" ") + ") " + serializeType(t.body) + ")";
  } else {
    const params = typeParams(t);

    if (params.length === 0) {
      return t.tag;
    } else {
      return "(" + t.tag + " " + params.map(serializeType).join(" ") + ")";
    }
  }
}
