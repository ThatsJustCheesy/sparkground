import { isEmpty } from "lodash";
import { InferrableType, Type, isTypeVar, isUnknown, typeParams } from "./type";

export function serializeType(t: Type | InferrableType): string {
  if (isTypeVar(t)) return t.var;
  if (isUnknown(t)) return `<${t.unknown}>`;

  if (t.tag === "Function") return `${serializeType(t.in)} → ${serializeType(t.out)}`;
  if (t.tag === "Pair") return `(${serializeType(t.car)} . ${serializeType(t.cdr)})`;
  if (t.tag === "List") return `[${serializeType(t.element)}]`;

  const params = typeParams(t);
  if (isEmpty(params)) return t.tag;

  return `${t.tag}[${Object.entries(params)
    .map(([key, type]) => `${key}: ${serializeType(type)}`)
    .join(", ")}]`;
}
