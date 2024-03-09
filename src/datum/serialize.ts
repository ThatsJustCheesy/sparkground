import { Datum } from "./datum";

export function serializeDatum(datum: Datum): string {
  switch (datum.kind) {
    case "Boolean":
      return datum.value ? "#t" : "#f";
    case "Number":
      return `${datum.value}`;
    case "String":
      return `"${datum.value.replace(/["\\]/g, "\\$&")}"`;
    case "Symbol":
      return datum.value;
    case "List": {
      const heads = datum.heads.map(serializeDatum).join(" ");
      if (datum.tail) {
        const tail = serializeDatum(datum.tail);
        return `(${heads} . ${tail})`;
      }
      return `(${heads})`;
    }
  }
}
