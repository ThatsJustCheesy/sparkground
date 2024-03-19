import {
  Type,
  functionParamTypes,
  functionResultType,
  hasTag,
  isForallType,
  isTypeNameBinding,
  isTypeNameHole,
  isTypeVar,
  typeParams,
} from "./type";

export function serializeType(t: Type): string {
  if (isTypeVar(t)) {
    return "#" + t.var;
  } else if (isTypeNameBinding(t)) {
    return "#" + t.id;
  } else if (isTypeNameHole(t)) {
    return "·";
  } else if (isForallType(t)) {
    return "(All (" + t.forall.map(serializeType).join(" ") + ") " + serializeType(t.body) + ")";
  } else {
    const params = typeParams(t);

    if (params.length === 0) {
      return t.tag;
    } else {
      return "(" + t.tag + " " + params.map(serializeType).join(" ") + ")";
    }
  }
}

export function prettyPrintType(t: Type): string {
  if (isTypeVar(t)) {
    return "#" + t.var;
  } else if (isTypeNameBinding(t)) {
    return "#" + t.id;
  } else if (isTypeNameHole(t)) {
    return "·";
  } else if (isForallType(t)) {
    return "∀" + t.forall.map(prettyPrintType).join(" ") + ". " + prettyPrintType(t.body);
  } else {
    const params = typeParams(t);

    if (params.length === 0) {
      return t.tag;
    } else if (hasTag(t, "Function")) {
      return (
        "(" +
        functionParamTypes(t).map(prettyPrintType).join(" ") +
        " → " +
        prettyPrintType(functionResultType(t)) +
        ")"
      );
    } else if (hasTag(t, "Function*")) {
      const paramTypes = functionParamTypes(t);
      return (
        "(" +
        paramTypes.slice(0, -1).map(prettyPrintType).join(" ") +
        (paramTypes.length > 1 ? " " : "") +
        prettyPrintType(paramTypes.at(-1)!) +
        "... → " +
        prettyPrintType(functionResultType(t)) +
        ")"
      );
    } else {
      return "(" + t.tag + " " + params.map(prettyPrintType).join(" ") + ")";
    }
  }
}
