import { Type, isTypeVar, typeStructureMap } from "./type";

export type TypeSubstitution = Record<string, Type>;

export function typeSubstitute(type: Type, sub: TypeSubstitution): Type {
  if (isTypeVar(type)) {
    return sub[type.var] ?? type;
  } else {
    return typeStructureMap(type satisfies Type as Type, (t) => typeSubstitute(t, sub));
  }
}

export function typeVarOccurs(typeVarName: string, type: Type): boolean {
  if (isTypeVar(type)) {
    return type.var === typeVarName;
  } else {
    return (type.of ?? []).some((child) => typeVarOccurs(typeVarName, child));
  }
}
