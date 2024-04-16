import { PageID, Point } from "../editor/trees/Trees";

export type DefinitionAttributes = {
  location?: Point;
  page?: PageID;
};

export function parseAttributes(text: string): DefinitionAttributes {
  let attrs: DefinitionAttributes = {};

  const matches = text.matchAll(/\b(x|y|page):(\S+)/g);
  for (const match of matches) {
    switch (match[1]) {
      case "x":
        attrs.location = {
          x: Number(match[2]),
          y: attrs.location?.y ?? 0,
        };
        break;
      case "y":
        attrs.location = {
          x: attrs.location?.x ?? 0,
          y: Number(match[2]),
        };
        break;
      case "page":
        attrs.page = Number(match[2]);
        break;
    }
  }

  return attrs;
}

export function serializeAttributes(attrs: DefinitionAttributes): string {
  return [
    attrs.location && `x:${attrs.location.x} y:${attrs.location.y}`,
    attrs.page && `page:${attrs.page}`,
  ]
    .filter((x) => x)
    .join(" ");
}
