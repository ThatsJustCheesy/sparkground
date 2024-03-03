import { isEqual } from "lodash";
import { Any, Never, Type, isForallType, isTypeVar, isTypeVarSlot } from "../type";
import { ConstraintSet, constraintSetMeet, constraintSetsMeet } from "./constraint-set";
import { typeParamVariance } from "../subtyping";

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
  if (isTypeVarSlot(subtype) || isTypeVarSlot(supertype)) {
    // TODO: Improve error if necessary
    throw "invalid constraint generation";
  }

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
  } else if (isForallType(subtype) || isForallType(supertype)) {
    if (
      !(isForallType(subtype) && isForallType(supertype)) ||
      !isEqual(subtype.forall, supertype.forall)
    ) {
      // TODO: Improve error, if this is even necessary
      throw "invalid constraint generation";
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

    if (constraintSets.some((set) => set === undefined)) {
      // TODO: Improve error, if this is even necessary
      throw "invalid constraint generation";
    }

    return constraintSetsMeet(constraintSets as ConstraintSet[]);
  } else {
    // TODO: Improve error, if this is even necessary
    throw "invalid constraint generation";
  }
}
