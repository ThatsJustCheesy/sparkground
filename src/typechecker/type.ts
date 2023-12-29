import { mapValues } from "lodash";

/**
 * Static type (of an expression).
 *
 * Instances of `Type` do not contain "unknown" (unsolved) type variables.
 * However, they may be polymorphic; e.g.,, the identity function has type `Function[a, a]`,
 * where `a` is an unconstrained polymorphic type variable (`TypeVar`).
 *
 * To find the best available `Type` for an expression, use `TypeInferrer`.
 */
export type Type = ConcreteType | TypeVar;

/**
 * Static type (of an expression) containing no type variables.
 *
 * e.g.,
 *  - `Int`
 *  - `List[Any]`
 *  - `Function[Int, String]`
 */
export type ConcreteType = Types[keyof Types];

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

  // TODO: These constraints are not implemented
  /** Subtype contraint: `a <: b` */
  below?: Type;
  /** Supertype contraint: `b <: a` or `a :> b` */
  above?: Type;
};
export function isTypeVar(type: InferrableType): type is TypeVar {
  // FIXME: Prone to break if anyone uses this as a type parameter name!
  //        Use a special name to ensure no collisions.
  return "var" in type;
}

export function assertNoTypeVar(type: Type, message?: string): asserts type is ConcreteType;
export function assertNoTypeVar(
  type: InferrableType,
  message?: string
): asserts type is ConcreteInferrableType;
export function assertNoTypeVar(type: InferrableType, message?: string) {
  if (!hasNoTypeVar(type)) throw `assertion failed: ${message ?? "type has a type var"}`;
}
export function hasNoTypeVar(type: Type): type is ConcreteType;
export function hasNoTypeVar(type: InferrableType): type is ConcreteInferrableType;
export function hasNoTypeVar(type: InferrableType) {
  return (
    isUnknown(type) || (!isTypeVar(type) && Object.values(typeParams(type)).every(hasNoTypeVar))
  );
}

export type Types = {
  [Tag in keyof typeof TypeDefs]: {
    tag: Tag;
  } & {
    [Param in (typeof TypeDefs)[Tag][number]]: Type;
  };
};

const TypeDefs = {
  Any: [],
  Never: [],
  Null: [],
  Number: [],
  Integer: [],
  Boolean: [],
  String: [],
  Symbol: [],
  List: ["element"],
  Function: ["in", "out"],
  Procedure: ["out"],
} as const satisfies Record<string, Readonly<string[]>>;

// For type inference algorithm only.
export type InferrableType = ConcreteInferrableType | TypeVar;
export type ConcreteInferrableType = InferrableTypes[keyof InferrableTypes] | Unknown;

// Ditto.
export type InferrableTypes = {
  [Tag in keyof typeof TypeDefs]: {
    tag: Tag;
  } & {
    [Param in (typeof TypeDefs)[Tag][number]]: InferrableType | Unknown;
  };
};

// Ditto.
export type Unknown = { unknown: string };
export function isUnknown(type: InferrableType): type is Unknown {
  // FIXME: Prone to break if anyone uses this as a type parameter name!
  //        Use a special name to ensure no collisions.
  return "unknown" in type;
}

// Ditto.
export function assertNoUnknown(type: InferrableType, message?: string): asserts type is Type {
  if (!hasNoUnknown(type)) throw `assertion failed: ${message ?? "type has unknown"}`;
}
export function hasNoUnknown(type: InferrableType): type is Type {
  return (
    isTypeVar(type) || (!isUnknown(type) && Object.values(typeParams(type)).every(hasNoUnknown))
  );
}

/**
 * Type parameters of `type`, in order and keyed by name.
 *
 * e.g.,
 *  - `typeParams(Int) == {}`
 *  - `typeParams(List[Int]) == typeParams(List[element: Int]) == { element: Int }`
 *  - `typeParams(T[U1, U2, ..., UN]) == typeParams(T[key1: U1, key2: U2, ..., keyN: UN]) == { key1: U1, key2: U2, ..., keyN: UN] }`
 */
export function typeParams(type: InferrableType): Record<string, Type>;
export function typeParams(type: InferrableType): Record<string, InferrableType>;

export function typeParams(type: InferrableType): Record<string, InferrableType> {
  if (isUnknown(type) || isTypeVar(type)) return {};
  const params: Omit<Type, "tag"> & Partial<Pick<ConcreteType, "tag">> = { ...type };
  delete params.tag;
  return params as Omit<Type, "tag">;
}

/**
 * fmap for `Type`, `InferrableType`, etc.
 */
export function typeStructureMap<T extends Type | InferrableType, R extends T>(
  t: T,
  fn: (t_: T) => R
): R;

export function typeStructureMap(
  t: InferrableType,
  fn: (t_: InferrableType) => InferrableType
): InferrableType {
  if (isUnknown(t) || isTypeVar(t)) return t;
  return {
    tag: t.tag,
    ...mapValues(typeParams(t), (type) => fn(type)),
  } as InferrableType;
}
