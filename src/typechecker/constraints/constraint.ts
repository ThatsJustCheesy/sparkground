import { isEqual } from "lodash";
import { Any, Never, Type } from "../type";
import { isSubtype, typeJoin, typeMeet } from "../subtyping";

export type Constraint = EqualityConstraint | SubtypeConstraint;

export type EqualityConstraint = {
  constraint: "equal";
  type: Type;
};

export type SubtypeConstraint = {
  constraint: "subtype";
  lowerBound: Type;
  upperBound: Type;
};

/** Identity with respect to constraintMeet. */
export const TopConstraint: SubtypeConstraint = {
  constraint: "subtype",
  lowerBound: Never,
  upperBound: Any,
};

export function constraintMeet(first: Constraint, second: Constraint): Constraint | undefined {
  if (second.constraint === "subtype") {
    [first, second] = [second, first];
  }
  // If either is a subtype constraint, now the first one is. (Meet is commutative)

  if (first.constraint === "equal") {
    // Both are equality constraints.
    return isEqual(first.type, (second as EqualityConstraint).type) ? first : undefined;
  } else if (second.constraint === "equal") {
    // First is a subtype constraint, and second is an equality constraint.
    return isSubtype(first.lowerBound, second.type) && isSubtype(second.type, first.upperBound)
      ? second
      : undefined;
  } else {
    // Both are subtype constraints.
    return {
      constraint: "subtype",
      lowerBound: typeJoin(first.lowerBound, second.lowerBound),
      upperBound: typeMeet(first.upperBound, second.upperBound),
    };
  }
}

export function constraintsMeet(constraints: Constraint[]): Constraint | undefined {
  return constraints.reduce(constraintMeet, TopConstraint);
}

export function isConstraintSatisfiable(constraint: Constraint) {
  switch (constraint.constraint) {
    case "equal":
      return true;
    case "subtype":
      return isSubtype(constraint.lowerBound, constraint.upperBound);
  }
}
