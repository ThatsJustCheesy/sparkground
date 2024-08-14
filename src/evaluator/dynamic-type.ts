import { DynamicSignatureMismatch } from "./errors";
import { Value } from "./value";

export type DynamicType = string;
export const DynamicTypeAny = "Any";

export type DynamicFnSignature = DynamicParamSignature[];
export type DynamicParamSignature = {
  name: string;
  variadic?: boolean;
  optional?: boolean;
  type?: DynamicType;
};

export function prettyPrintSignature(signature: DynamicFnSignature): string {
  return signature
    .map(
      (param) =>
        (param.type ? "(" + param.name + " : " + param.type + ")" : param.name) +
        (param.variadic ? "..." : param.optional ? "?" : ""),
    )
    .join(" ");
}
export function prettyPrintSignatureNames(signature: DynamicFnSignature): string {
  return signature
    .map((param) => param.name + (param.variadic ? "..." : param.optional ? "?" : ""))
    .join(" ");
}

export function checkCallAgainstTypeSignature(
  argValues: Value[],
  signature: DynamicFnSignature,
): void {
  if (
    !dynamicSignatureMatch(
      argValues.map((value) => value.kind),
      signature,
    )
  ) {
    throw {
      tag: "DynamicSignatureMismatch",
      argValues,
      signature,
    } satisfies DynamicSignatureMismatch;
  }
}

function dynamicSignatureMatch(actualTypes: DynamicType[], signature: DynamicFnSignature): boolean {
  let params = [...signature];
  checkParam: for (const actual of actualTypes) {
    let nextParam: DynamicParamSignature | undefined;
    while (true) {
      nextParam = params[0];
      if (nextParam === undefined) {
        // Signature is out of parameters to match with
        return false;
      }
      if (!nextParam.variadic) params.shift();

      if (dynamicTypeAssignable(nextParam.type ?? DynamicTypeAny, actual)) {
        // Matches
        continue checkParam;
      } else if (nextParam.variadic) {
        // Try to match next
        params.shift();
        continue;
      } else {
        // Failed to match non-variadic parameter
        return !!nextParam.optional;
      }
    }
  }

  return params.length === 0 || params[0]!.optional || params.every((param) => param.variadic);
}

function dynamicTypeAssignable(destination: DynamicType, source: DynamicType) {
  return destination === DynamicTypeAny || destination === source;
}
