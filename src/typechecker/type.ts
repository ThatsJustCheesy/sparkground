/**
 * Static type (of an expression).
 *
 * To find the best available static type for an expression, use `Typechecker`.
 */
export type Type = ConcreteType | ForallType | TypeVar | TypeVarSlot;

/**
 * Static type (of an expression).
 *
 * e.g.,
 *  - `Int`
 *  - `List[Any]`
 *  - `Function[Int, String]`
 */
export type ConcreteType = SimpleConcreteType | VariadicFunctionType;

export type SimpleConcreteType<Tag extends string = string> = {
  tag: Tag;
  of?: Type[];
};

export type VariadicFunctionType = {
  tag: "Function*";
  of: Type[];

  minArgCount?: number;
  maxArgCount?: number;
};

export function isConcreteType(type: Type): type is ConcreteType {
  return "tag" in type;
}

export function typeParams(type: Type): Type[] {
  if (isTypeVar(type) || isTypeVarSlot(type)) return [];
  if (isForallType(type)) return typeParams(type.body);
  return type.of ?? [];
}

export function functionParamTypes(
  fnType: SimpleConcreteType<"Function"> | VariadicFunctionType
): Type[] {
  return typeParams(fnType).slice(0, -1);
}
export function functionResultType(
  fnType: SimpleConcreteType<"Function"> | VariadicFunctionType
): Type {
  return typeParams(fnType).at(-1) ?? Any;
}

export function functionMinArgCount(type: Type): number {
  if (isForallType(type)) {
    return functionMinArgCount(type.body);
  } else if (hasTag(type, "Function")) {
    return (type.of?.length ?? 1) - /* return type */ 1;
  } else if (hasTag(type, "Function*")) {
    return (
      type.minArgCount ??
      type.of.length - /* one for vararg (zero or more), one for return type */ 2
    );
  } else {
    return 0;
  }
}

export function functionMaxArgCount(type: Type): number {
  if (isForallType(type)) {
    return functionMaxArgCount(type.body);
  } else if (hasTag(type, "Function")) {
    return (type.of?.length ?? 1) - 1;
  } else if (hasTag(type, "Function*")) {
    return type.maxArgCount ?? Infinity;
  } else {
    return Infinity;
  }
}

export function hasTag<Tag extends string>(type: Type, tag: Tag): type is SimpleConcreteType<Tag>;
export function hasTag(type: Type, tag: "Function*"): type is VariadicFunctionType;

export function hasTag<Tag extends string>(type: Type, tag: Tag): boolean {
  return isConcreteType(type) && type.tag === tag;
}

export type TypeVarSlot = TypeNameHole | TypeNameBinding;
export function isTypeVarSlot(type: Type): type is TypeVarSlot {
  return isTypeNameHole(type) || isTypeNameBinding(type);
}

export type ForallType = {
  /** Type variable names. */
  forall: TypeVarSlot[];
  body: Type;
};
export function isForallType(type: Type): type is ForallType {
  return "forall" in type;
}
export function isTypeVarBoundBy(typeVarName: string, forallType: ForallType) {
  return forallType.forall.some((slot) => isTypeVar(slot) && slot.var === typeVarName);
}

export type TypeNameHole = {
  kind: "type-name-hole";
};
export function isTypeNameHole(type: Type): type is TypeNameHole {
  return "kind" in type && type.kind === "type-name-hole";
}

export type TypeNameBinding = {
  kind: "type-name-binding";
  id: string;
};
export function isTypeNameBinding(type: Type): type is TypeNameBinding {
  return "kind" in type && type.kind === "type-name-binding";
}

/**
 * Placeholder for a type in a polymorphic type expression.
 *
 * e.g.,
 *  - the identity function has type `Function[a, a]`, where `a` is an unconstrained `TypeVar`
 *  - `cons` has type `Function[a, Function[List[a], List[a | b]]]`
 *    (among others), where `a` and `b` are unconstrained `TypeVar`s
 */
export type TypeVar = {
  /** Type variable name. */
  var: string;
};
export function isTypeVar(type: Type): type is TypeVar {
  return "var" in type;
}

export type BuiltinType =
  | { tag: "Any" }
  | { tag: "Never" }
  | { tag: "Empty" }
  | { tag: "Number" }
  | { tag: "Integer" }
  | { tag: "Boolean" }
  | { tag: "String" }
  | { tag: "Symbol" }
  | { tag: "List"; of: [element: Type] }
  | { tag: "Function"; of: Type[] }
  | { tag: "Promise"; of: [value: Type] };

export const Untyped: SimpleConcreteType<"?"> = { tag: "?" };
export const Any: SimpleConcreteType<"Any"> = { tag: "Any" };
export const Never: SimpleConcreteType<"Never"> = { tag: "Never" };

export function typeParamMap(t: Type, fn: (t_: Type, index: number) => Type): Type {
  if (isTypeVar(t) || isTypeVarSlot(t)) {
    return t;
  } else if (isForallType(t)) {
    return {
      forall: t.forall,
      body: typeParamMap(t.body, fn),
    };
  } else {
    const tag = t.tag;
    const params = typeParams(t).map(fn);
    return params.length ? { tag, of: params } : { tag };
  }
}
