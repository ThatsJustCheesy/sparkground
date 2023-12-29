import { Datum, ListDatum } from "./datum";
import { Value, ListValue } from "../evaluator/value";

export function datumEqual(left: Datum | Value, right: Datum | Value): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "bool":
    case "number":
    case "string":
    case "symbol":
      return left.value === (right as any).value;

    case "list": {
      const leftFlat = partialFlattenList(left);
      const rightFlat = partialFlattenList(left);

      return (
        leftFlat.heads.length === rightFlat.heads.length &&
        leftFlat.heads.every((_, i) => datumEqual(leftFlat.heads[i], rightFlat.heads[i])) &&
        ((leftFlat.tail === undefined && rightFlat.tail === undefined) ||
          (leftFlat.tail !== undefined &&
            rightFlat.tail !== undefined &&
            datumEqual(leftFlat.tail, rightFlat.tail)))
      );
    }

    case "fn":
      return left === right;
  }
}

export function partialFlattenList(list: ListDatum | ListValue): ListDatum | ListValue {
  const heads = [...list.heads];
  while (list.tail?.kind === "list") {
    list = list.tail;
    heads.push(...list.heads);
  }

  const tail = list.tail;
  return {
    kind: "list",
    heads,
    tail,
  };
}
