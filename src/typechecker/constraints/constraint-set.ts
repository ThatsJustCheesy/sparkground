import { isEqual, mapValues } from "lodash";
import { Type, isForallType, isTypeVar, isTypeVarBoundBy, isTypeVarSlot } from "../type";
import { TypeSubstitution } from "../type-substitution";
import { Constraint, TopConstraint, constraintMeet, isConstraintSatisfiable } from "./constraint";
import { TypeParamVariance, typeParamVariance } from "../subtyping";

export type ConstraintSet = Record<string, Constraint>;

export function constraintSetMeet(
  first: ConstraintSet,
  second: ConstraintSet
): ConstraintSet | undefined {
  const names = [...new Set([...Object.keys(first), ...Object.keys(second)]).values()];
  const constraintSet = Object.fromEntries(
    names.map((name) => [
      name,
      constraintMeet(first[name] ?? TopConstraint, second[name] ?? TopConstraint),
    ])
  );

  if (Object.values(constraintSet).some((constraint) => constraint === undefined)) {
    return undefined;
  }
  return constraintSet as ConstraintSet;
}

export function constraintSetsMeet(constraintSets: ConstraintSet[]) {
  return constraintSets.reduce(constraintSetMeet, {});
}

export function areConstraintsSatisfiable(constraints: ConstraintSet) {
  return Object.values(constraints).every(isConstraintSatisfiable);
}

const NoMinimalSubstitution = {};

/**
 * Computes a minimal (most informative) solution for `constraints` on `type`.
 */
export function computeMinimalSubstitution(
  constraints: ConstraintSet,
  type: Type
): TypeSubstitution | undefined {
  if (!areConstraintsSatisfiable(constraints)) return undefined;

  try {
    return mapValues(constraints, (constraint, name): Type => {
      // TODO: Handle equality constraints for bounded quantification
      if (constraint.constraint === "equal") throw "TODO";

      const variance = varianceForTypeVar(type, name);
      switch (variance) {
        case "constant":
        case "covariant":
          return constraint.lowerBound;
        case "contravariant":
          return constraint.upperBound;
        case "invariant":
          if (!isEqual(constraint.lowerBound, constraint.upperBound)) {
            throw NoMinimalSubstitution;
          }
          return constraint.lowerBound;
      }
    });
  } catch (error) {
    if (error === NoMinimalSubstitution) return undefined;
    throw error;
  }
}

type TypeVarVariance = "constant" | "covariant" | "contravariant" | "invariant";

function negateVariance(variance: TypeVarVariance): TypeVarVariance {
  switch (variance) {
    case "constant":
    case "invariant":
      return variance;
    case "covariant":
      return "contravariant";
    case "contravariant":
      return "covariant";
  }
}

function zeroVariance(variance: TypeVarVariance): TypeVarVariance {
  switch (variance) {
    case "constant":
      return variance;
    case "invariant":
    case "covariant":
    case "contravariant":
      return "invariant";
  }
}

function signAdjustVariance(variance: TypeVarVariance, sign: TypeParamVariance): TypeVarVariance {
  switch (sign) {
    case "covariant":
      return variance;
    case "contravariant":
      return negateVariance(variance);
    case "invariant":
      return zeroVariance(variance);
  }
}

function varianceForTypeVar(type: Type, typeVarName: string): TypeVarVariance {
  if (isTypeVarSlot(type)) {
    return "constant";
  } else if (isTypeVar(type)) {
    return type.var === typeVarName ? "covariant" : "constant";
  } else if (isForallType(type)) {
    if (isTypeVarBoundBy(typeVarName, type)) {
      // Shadowed
      return "constant";
    }
    return varianceForTypeVar(type.body, typeVarName);
  } else {
    const signs = typeParamVariance(type);
    const typeArgVariances = (type.of ?? [])
      .map((typeArg) => varianceForTypeVar(typeArg, typeVarName))
      .map((variance, index) => signAdjustVariance(variance, signs[index]!));

    const hasCovariantArg = typeArgVariances.includes("covariant");
    const hasContravariantArg = typeArgVariances.includes("contravariant");
    const hasInvariantArg = typeArgVariances.includes("invariant");

    if (hasInvariantArg || (hasCovariantArg && hasContravariantArg)) {
      return "invariant";
    } else if (hasCovariantArg) {
      return "covariant";
    } else if (hasContravariantArg) {
      return "contravariant";
    } else {
      return "constant";
    }
  }
}
