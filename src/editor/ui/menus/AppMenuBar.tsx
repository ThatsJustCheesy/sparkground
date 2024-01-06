import { SyntheticEvent } from "react";
import { Parser } from "../../../expr/parse";
import { deforest, Point, newTree } from "../../trees/trees";
import MenuBar from "./MenuBar";
import MenuBarButton from "./MenuBarButton";
import MenuBarTitle from "./MenuBarTitle";

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
          const source = await onShowLoad(event);
          if (source === undefined) return;

          const exprs = Parser.parseToExprsWithAttributes(source);
          if (!exprs.length) return;

          deforest();

          let location: Point = { x: 0, y: 0 };
          exprs.forEach((expr) => {
            if (expr.attributes?.location) {
              location = expr.attributes.location;
            }
            newTree(expr, { ...location });
            location.y += 200;
          });
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