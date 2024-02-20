import { InferrableType, Type, isTypeVar, isUnknown } from "./type";

export function serializeType(t: Type | InferrableType): string {
  if (isTypeVar(t)) return t.var;
  if (isUnknown(t)) return `${t.unknown}`;

  const params = t.of ?? [];

  if (params.length === 0) {
    return t.tag;
  } else {
    return "(" + t.tag + " " + params.map(serializeType).join(" ") + ")";
  }
}
