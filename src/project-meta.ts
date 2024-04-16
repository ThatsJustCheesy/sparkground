import { Page, PageID } from "./editor/trees/Trees";

export type ProjectMeta = {
  pages?: Page[];
  currentPageID?: PageID;
};

export function parseProjectMeta(source: string): [ProjectMeta, string] {
  const originalSource = source;

  while (true) {
    const [line] = source.split("\n", 1);

    if (!line?.match(/^\s*;|^\s*$/)) break;
    const rest = source.slice(line.length + 1);

    const match = line.match(/^\s*;\s*meta:(.*)$/i);
    if (match) return [JSON.parse(match[1]!), rest];

    if (!rest) break;
    source = rest;
  }

  // No metadata present
  return [{}, originalSource];
}

export function serializeProjectMeta(meta: ProjectMeta): string {
  return `; meta: ${JSON.stringify(meta)}\n\n`;
}
