import { Value } from "./value";

export type DynamicType = string;
export const DynamicTypeAny = "Any";

export type DynamicFnSignature = DynamicParamSignature[];
export type DynamicParamSignature = {
  name: string;
  variadic?: boolean;
  type?: DynamicType;
};

export type DynamicSignatureMismatch = {
  tag: "DynamicSignatureMismatch";
  argValues: Value[];
  signature: DynamicFnSignature;
};

export function checkCallAgainstTypeSignature(
  argValues: Value[],
  signature: DynamicFnSignature
): void {
  if (
    !dynamicSignatureMatch(
      argValues.map((value) => value.kind),
      signature
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
        return false;
      }
    }
  }

  return params.every((param) => param.variadic);
}

function dynamicTypeAssignable(destination: DynamicType, source: DynamicType) {
  return destination === DynamicTypeAny || destination === source;
}
