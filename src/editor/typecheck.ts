import { mapValues } from "lodash";
import { Any, SimpleConcreteType, Type, VariadicFunctionType } from "../typechecker/type";
import { Binding, Environment, InitialEnvironment } from "./library/environments";
import { Value } from "../evaluator/value";
import { TypeContext } from "../typechecker/typecheck";

export const InitialTypeContext = typeContextFromEnv(InitialEnvironment);

export function typeContextFromEnv(environment: Environment): TypeContext {
  return mapValues(environment, typeOfBinding);
}
export function typeOfBinding(binding: Binding<Value>): Type {
  const attrs = binding.attributes;
  if (!attrs) return Any;

  if (attrs.typeAnnotation) return attrs.typeAnnotation;

  const { argTypes, retType, minArgCount, maxArgCount } = attrs;

  if (minArgCount !== undefined && minArgCount === maxArgCount) {
    // Simple function

    return {
      tag: "Function",
      of: [...(argTypes ?? Array(minArgCount).fill(Any)), retType ?? Any],
    } satisfies SimpleConcreteType<"Function">;
  } else {
    // Variadic function

    return {
      tag: "Function*",
      of: [...(argTypes ?? Array((minArgCount ?? 1) - 1).fill(Any)), retType ?? Any],
      minArgCount,
      maxArgCount,
    } satisfies VariadicFunctionType;
  }
}
