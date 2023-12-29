import { Datum } from "./datum";

export function serializeDatum(datum: Datum): string {
  switch (datum.kind) {
    case "bool":
      return datum.value ? "#t" : "#f";
    case "number":
      return `${datum.value}`;
    case "string":
      return `"${datum.value.replace(/["\\]/g, "\\$&")}"`;
    case "symbol":
      return datum.value;
    case "list": {
      const heads = datum.heads.map(serializeDatum).join(" ");
      if (datum.tail) {
        const tail = serializeDatum(datum.tail);
        return `(${heads} . ${tail})`;
      }
      return `(${heads})`;
    }
  }
}
