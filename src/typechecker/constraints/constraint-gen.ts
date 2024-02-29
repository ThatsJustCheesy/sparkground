import { isEqual } from "lodash";
import { Any, Never, Type, isTypeVar } from "../type";
import { ConstraintSet, constraintSetMeet, constraintSetsMeet } from "./constraint-set";
import { typeParamVariance } from "../subtyping";

export function generateConstraints(
  constrainVarNames: string[],
  subtype: Type,
  supertype: Type
): ConstraintSet | undefined {
  // TODO: Eliminate down/up

  if (isTypeVar(subtype)) {
    if (constrainVarNames.includes(subtype.var)) {
      // CG-Upper
      return {
        [subtype.var]: {
          constraint: "subtype",
          lowerBound: Never,
          upperBound: supertype,
        },
      };
    } else if (isEqual(subtype, supertype)) {
      // CG-Refl
      return {};
    }
  } else if (isTypeVar(supertype)) {
    if (constrainVarNames.includes(supertype.var)) {
      // CG-Lower
      return {
        [supertype.var]: {
          constraint: "subtype",
          lowerBound: subtype,
          upperBound: Any,
        },
      };
    }
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
            return generateConstraints(constrainVarNames, subtypeArg, supertypeArg);
          case "contravariant":
            return generateConstraints(constrainVarNames, supertypeArg, subtypeArg);
          case "invariant": {
            const positiveSet = generateConstraints(constrainVarNames, subtypeArg, supertypeArg);
            const negativeSet = generateConstraints(constrainVarNames, supertypeArg, subtypeArg);

            if (positiveSet === undefined || negativeSet === undefined) {
              return undefined;
            }

            return constraintSetMeet(positiveSet, negativeSet);
          }
        }
      }
    );

    if (constraintSets.some((set) => set === undefined)) {
      // TODO: Improve error, if this is even necessary
      throw "invalid constraing generation";
    }

    return constraintSetsMeet(constraintSets as ConstraintSet[]);
  } else {
    // TODO: Improve error, if this is even necessary
    throw "invalid constraing generation";
  }
}
