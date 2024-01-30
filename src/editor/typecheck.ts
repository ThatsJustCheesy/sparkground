import { TypeEnv } from "../typechecker/infer";
import { mapValues } from "lodash";
import { Type } from "../typechecker/type";
import { Binding, Environment, InitialEnvironment } from "./library/environments";
import { Value } from "../evaluator/value";

export const InitialTypeEnvironment = envAsTypeEnv(InitialEnvironment);

export function envAsTypeEnv(environment: Environment): TypeEnv {
  return mapValues(environment, typeOfBinding);
}
export function typeOfBinding(binding: Binding<Value>): Type {
  return (
    binding.attributes?.argTypes?.reduceRight(
      (retType, argType) => ({ tag: "Function", in: argType, out: retType }),
      binding.attributes?.retType!
    ) ?? { tag: "Any" } // FIXME: Don't give "Any" as a fallback
  );
}
