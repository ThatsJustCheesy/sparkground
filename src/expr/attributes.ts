import { Point } from "../editor/trees/trees";

export type DefinitionAttributes = {
  location?: Point;
};

export function parseAttributes(text: string): DefinitionAttributes {
  let attrs: DefinitionAttributes = {};

  const matches = text.matchAll(/\b(x|y):(\S+)/g);
  for (const match of matches) {
    switch (match[1]) {
      case "x":
        attrs.location = {
          x: Number(match[2]),
          y: attrs.location?.y ?? 0,
        };
      case "y":
        attrs.location = {
          x: attrs.location?.x ?? 0,
          y: Number(match[2]),
        };
    }
  }

  return attrs;
}

export function serializeAttributes(attrs: DefinitionAttributes): string {
  return attrs.location ? `x:${attrs.location.x} y:${attrs.location.y}` : "";
}
