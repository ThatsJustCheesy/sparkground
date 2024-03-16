import { SyntheticEvent } from "react";
import { Parser } from "../../../expr/parse";
import { deforest, Point, newTree, PageID, globalMeta, setGlobalMeta } from "../../trees/trees";
import MenuBar from "./MenuBar";
import MenuBarButton from "./MenuBarButton";
import MenuBarTitle from "./MenuBarTitle";
import { ProjectMeta, parseProjectMeta } from "../../../project-meta";

export type Props = {
  onShowLoad: (event: SyntheticEvent) => Promise<string | undefined>;
  onShowSave: (event: SyntheticEvent) => Promise<void>;
  onShowHelp: (event: SyntheticEvent) => void;

  rerender: () => void;
};

export default function AppMenuBar({ onShowLoad, onShowSave, onShowHelp, rerender }: Props) {
  return (
    <MenuBar>
      <MenuBarTitle>Sparkground</MenuBarTitle>

      <MenuBarButton
        action={async (event) => {
          const ok = confirm("Any unsaved changes will be lost. Proceed?");
          if (!ok) return;

          deforest();
          rerender();
        }}
      >
        New
      </MenuBarButton>
      <MenuBarButton
        action={async (event) => {
          let source = await onShowLoad(event);
          if (source === undefined) return;

          let meta: ProjectMeta;
          [meta, source] = parseProjectMeta(source);

          const exprs = Parser.parseToExprsWithAttributes(source);
          if (!exprs.length) return;

          deforest();

          let location: Point = { x: 0, y: 0 };
          exprs.forEach((expr) => {
            if (expr.attributes?.location) {
              location = expr.attributes.location;
            }
            const pageID: PageID = expr.attributes?.page ?? 0;
            newTree(expr, { ...location }, pageID);
            location.y += 200;
          });
          setGlobalMeta(meta);
          rerender();
        }}
      >
        Load
      </MenuBarButton>
      <MenuBarButton
        action={async (event) => {
          await onShowSave(event);
        }}
      >
        Save
      </MenuBarButton>
      <MenuBarButton action={onShowHelp}>Help</MenuBarButton>
    </MenuBar>
  );
}
