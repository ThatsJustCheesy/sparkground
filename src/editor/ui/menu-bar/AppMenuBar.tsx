import { SyntheticEvent } from "react";
import { Parser } from "../../../expr/parse";
import { Point, PageID } from "../../trees/Trees";
import MenuBar from "./MenuBar";
import MenuBarButton from "./MenuBarButton";
import MenuBarTitle from "./MenuBarTitle";
import { ProjectMeta, parseProjectMeta } from "../../../project-meta";
import { Editor } from "../../state/Editor";

export type Props = {
  onShowLoad: (event: SyntheticEvent) => Promise<string | undefined>;
  onShowSave: (event: SyntheticEvent) => Promise<void>;
  onShowHelp: (event: SyntheticEvent) => void;

  onRunAll: (event: SyntheticEvent) => void;
  onStopAll: (event: SyntheticEvent) => void;

  editor: Editor;
};

export default function AppMenuBar({
  onShowLoad,
  onShowSave,
  onShowHelp,

  onRunAll,
  onStopAll,

  editor,
}: Props) {
  return (
    <MenuBar>
      <MenuBarTitle>Sparkground</MenuBarTitle>

      <MenuBarButton
        action={async (event) => {
          const ok = confirm("Any unsaved changes will be lost. Proceed?");
          if (!ok) return;

          editor.deforest();
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

          editor.deforest();

          let location: Point = { x: 0, y: 0 };
          exprs.forEach((expr) => {
            if (expr.attributes?.location) {
              location = expr.attributes.location;
            }
            const pageID: PageID = expr.attributes?.page ?? 0;
            editor.trees.addNew(expr, { ...location }, pageID);
            location.y += 200;
          });
          editor.trees.meta = meta;
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

      <MenuBarButton className="ms-4" action={onRunAll}>
        Run
      </MenuBarButton>
      <MenuBarButton action={onStopAll}>Stop</MenuBarButton>
    </MenuBar>
  );
}
