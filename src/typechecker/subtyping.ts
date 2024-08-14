import { isEqual } from "lodash";
import {
  Type,
  isTypeVar,
  ConcreteType,
  hasTag,
  typeParams,
  VariadicFunctionType,
  functionParamTypes,
  functionResultType,
  Any,
  Never,
  isForallType,
  isConcreteType,
  ForallType,
  isTypeVarSlot,
  Untyped,
} from "./type";

function typeCombine(
  t1: Type,
  t2: Type,
  takeMin: boolean,
  giveUpType: Type,
  typeCombineSame: (t1: Type, t2: Type) => Type,
  typeCombineOpposite: (t1: Type, t2: Type) => Type,
): Type {
  if (hasTag(t1, Untyped.tag)) return t1;
  if (hasTag(t2, Untyped.tag)) return t2;
  if (isSubtype(t1, t2, true)) return takeMin ? t1 : t2;
  if (isSubtype(t2, t1, true)) return takeMin ? t2 : t1;

  if (isTypeVar(t1) || isTypeVar(t2) || isTypeVarSlot(t1) || isTypeVarSlot(t2)) return giveUpType;

  if (isForallType(t1) || isForallType(t2)) {
    return isForallType(t1) && isForallType(t2) && isEqual(t1.forall, t2.forall)
      ? { forall: t1.forall, body: typeCombineSame(t1.body, t2.body) }
      : giveUpType;
  }

  // Concrete type
  if (t1.tag !== t2.tag) return giveUpType;

  const t1Params = t1.of ?? [];
  const t2Params = t2.of ?? [];
  const signs = typeParamVariance(t1);

  if (signs.some((sign) => sign === "invariant")) {
    return giveUpType;
  }

  const newTypeParams = signs.map((sign, index) => {
    switch (sign) {
      case "covariant":
        return typeCombineSame(t1Params[index]!, t2Params[index]!);
      case "contravariant":
        return typeCombineOpposite(t1Params[index]!, t2Params[index]!);
      case "invariant":
        throw "unreachable";
    }
  });

  return newTypeParams.length
    ? {
        tag: t1.tag,
        of: newTypeParams,
      }
    : { tag: t1.tag };
}

export function typeMeet(t1: Type, t2: Type): Type {
  return typeCombine(t1, t2, true, Never, typeMeet, typeJoin);
}

export function typeJoin(t1: Type, t2: Type): Type {
  return typeCombine(t1, t2, false, Any, typeJoin, typeMeet);
}

export function isSubtype(t1: Type, t2: Type, knownOnly = false) {
  if (hasTag(t1, Untyped.tag) || hasTag(t2, Untyped.tag)) return !knownOnly;
  return (
    hasTag(t1, Never.tag) ||
    hasTag(t2, Any.tag) ||
    (isTypeVar(t1) && isTypeVar(t2) && t1.var === t2.var) ||
    (isForallType(t1) && isForallType(t2) && isForallSubtype(t1, t2, knownOnly)) ||
    (isConcreteType(t1) && isConcreteType(t2) && isConcreteSubtype(t1, t2, knownOnly))
  );
}

function isForallSubtype(t1: ForallType, t2: ForallType, knownOnly: boolean): boolean {
  return isEqual(t1.forall, t2.forall) && isSubtype(t1.body, t2.body, knownOnly);
}

function isConcreteSubtype(t1: ConcreteType, t2: ConcreteType, knownOnly: boolean): boolean {
  if (isNominalSubtype(t1, t2)) return true;

  if (hasTag(t1, "Function*")) {
    // Variadic functions are a limited form of (possibly infinite) intersection types;
    // as such, they have special subtyping rules.
    return isVariadicSubtype(t1, t2, knownOnly);
  }

  if (t1.tag !== t2.tag) return false;

  const t1Params = typeParams(t1);
  const t2Params = typeParams(t2);
  if (t1Params.length !== t2Params.length) return false;

  return typeParamVariance(t1).every((variance, index) => {
    switch (variance) {
      case "covariant":
        return isSubtype(t1Params[index]!, t2Params[index]!, knownOnly);
      case "contravariant":
        return isSubtype(t2Params[index]!, t1Params[index]!, knownOnly);
      case "invariant":
        return isEqual(t1Params[index], t2Params[index]);
    }
  });
}

function isNominalSubtype(t1: ConcreteType, t2: ConcreteType): boolean {
  function matches(type: ConcreteType, tag: string, argCount: number) {
    return type.tag === tag && (type.of?.length ?? 0) === argCount;
  }

  return (
    (matches(t1, "Integer", 0) && matches(t2, "Number", 0)) ||
    (matches(t1, "Empty", 0) && matches(t2, "List", 1))
  );
}

function isVariadicSubtype(variadic: VariadicFunctionType, t2: ConcreteType, knownOnly: boolean) {
  if (hasTag(t2, "Function*")) {
    return isEqual(variadic, t2);
  }

  if (hasTag(t2, "Function")) {
    const variadicParams = functionParamTypes(variadic);
    const variadicResult = functionResultType(variadic);

    const fnParams = functionParamTypes(t2);
    const fnResult = functionResultType(t2);

    if (!variadicResult || !fnResult || !variadicParams.length) return false;

    return (
      // Number of function arguments is within variadic bounds?
      (variadic.minArgCount ?? 0) <= fnParams.length &&
      fnParams.length <= (variadic.maxArgCount ?? Infinity) &&
      // Variadic result type can be assigned to function result type?
      isSubtype(variadicResult, fnResult, knownOnly) &&
      // Function parameter types can be assigned to variadic parameter types?
      // If there are more function parameter types than variadic parameter types,
      // the last variadic parameter type T is treated as T* (Kleene star, repeating 0+ times).
      fnParams.every((fnParam, index) =>
        isSubtype(fnParam, variadicParams[index] ?? variadicParams.at(-1)!, knownOnly),
      )
    );
  }

  return false;
}

export type TypeParamVariance = "covariant" | "contravariant" | "invariant";

export function typeParamVariance(t: ConcreteType): TypeParamVariance[] {
  const typeParams = t.of ?? [];

  switch (t.tag) {
    case "List":
      return typeParams.map(() => "covariant");
    case "Function":
      return typeParams.map((param, index) =>
        index === typeParams.length - 1 ? "covariant" : "contravariant",
      );
    default:
      return typeParams.map(() => "invariant");
  }
}
