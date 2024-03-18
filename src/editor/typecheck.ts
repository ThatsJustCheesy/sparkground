import { mapValues } from "lodash";
import { Untyped } from "../typechecker/type";
import { Environment, InitialEnvironment } from "./library/environments";
import { TypeContext } from "../typechecker/typecheck";

export const InitialTypeContext = typeContextFromEnv(InitialEnvironment);

export function typeContextFromEnv(environment: Environment<unknown>): TypeContext {
  return mapValues(environment, (binding) => binding.attributes?.typeAnnotation ?? Untyped);
}
