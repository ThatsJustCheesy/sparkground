import { isEqual } from "lodash";
import {
  Any,
  Never,
  Type,
  Untyped,
  isForallType,
  isTypeVar,
  isTypeVarSlot,
  typeParamMap,
} from "../type";
import { ConstraintSet, constraintSetMeet, constraintSetsMeet } from "./constraint-set";
import { isSubtype, typeParamVariance } from "../subtyping";

export function generateConstraints(
  // V
  varNamesInScope: string[],
  // X
  constrainVarNames: string[],
  // S
  subtype: Type,
  // T
  supertype: Type
): ConstraintSet | undefined {
  if (isTypeVarSlot(subtype) || isTypeVarSlot(supertype)) return;

  if (isSubtype(subtype, supertype)) {
    // Nothing to enforce!
    // CG-Refl falls into here
    return {};
  } else if (isTypeVar(subtype)) {
    if (constrainVarNames.includes(subtype.var)) {
      // CG-Upper
      return {
        [subtype.var]: {
          constraint: "subtype",
          lowerBound: Never,
          upperBound: eliminateDown(varNamesInScope, supertype),
        },
      };
    }
  } else if (isTypeVar(supertype)) {
    if (constrainVarNames.includes(supertype.var)) {
      // CG-Lower
      return {
        [supertype.var]: {
          constraint: "subtype",
          lowerBound: eliminateUp(varNamesInScope, subtype),
          upperBound: Any,
        },
      };
    }
  } else if (isForallType(subtype) || isForallType(supertype)) {
    if (
      !(isForallType(subtype) && isForallType(supertype)) ||
      !isEqual(subtype.forall, supertype.forall)
    ) {
      return;
    }

    // FIXME: Somehow rename type vars if they appear in varNames or constrainVarNames
    return generateConstraints(
      [
        ...varNamesInScope,
        ...subtype.forall.flatMap((slot) => (isTypeVar(slot) ? [slot.var] : [])),
      ],
      constrainVarNames,
      subtype.body,
      supertype.body
    );
  } else if (subtype.tag === "Never" || supertype.tag === "Any") {
    // CG-Bot, CG-Top
    return {};
  } else if (subtype.tag === supertype.tag) {
    const signs = typeParamVariance(subtype);

    const constraintSets: (ConstraintSet | undefined)[] = signs.map(
      (sign, index): ConstraintSet | undefined => {
        const subtypeArg = subtype.of![index]!;
        const supertypeArg = supertype.of![index]!;

        switch (sign) {
          case "covariant":
            // prettier-ignore
            return generateConstraints(varNamesInScope, constrainVarNames, subtypeArg, supertypeArg);
          case "contravariant":
            // prettier-ignore
            return generateConstraints(varNamesInScope, constrainVarNames, supertypeArg, subtypeArg);
          case "invariant": {
            // prettier-ignore
            const positiveSet = generateConstraints(varNamesInScope, constrainVarNames, subtypeArg, supertypeArg);
            // prettier-ignore
            const negativeSet = generateConstraints(varNamesInScope, constrainVarNames, supertypeArg, subtypeArg);

            if (positiveSet === undefined || negativeSet === undefined) {
              return undefined;
            }

            return constraintSetMeet(positiveSet, negativeSet);
          }
        }
      }
    );

    if (constraintSets.some((set) => set === undefined)) return;

    return constraintSetsMeet(constraintSets as ConstraintSet[]);
  }
}

function eliminate(
  variables: string[],
  type: Type,
  promoteToType: Type,
  eliminateSame: (variables: string[], type: Type) => Type,
  eliminateOpposite: (variables: string[], type: Type) => Type
): Type {
  if (isTypeVarSlot(type)) return type;

  if (isTypeVar(type)) {
    return variables.includes(type.var) ? promoteToType : type;
  }

  if (isForallType(type)) {
    // FIXME: Somehow rename type vars
    return eliminateSame(variables, type.body);
  }

  const signs = typeParamVariance(type);
  return typeParamMap(type, (t, index): Type => {
    switch (signs[index]!) {
      case "covariant":
        return eliminateSame(variables, t);
      case "contravariant":
        return eliminateOpposite(variables, t);
      case "invariant":
        // Impossible to eliminate; give up
        // TODO: Probably should be an error...
        return Untyped;
    }
  });
}

export function eliminateUp(variables: string[], type: Type) {
  return eliminate(variables, type, Any, eliminateUp, eliminateDown);
}

export function eliminateDown(variables: string[], type: Type) {
  return eliminate(variables, type, Never, eliminateDown, eliminateUp);
}
