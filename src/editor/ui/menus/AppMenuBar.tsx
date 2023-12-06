import { SyntheticEvent } from "react";
import { Parser } from "../../ast/parse";
import { serializeExpr } from "../../ast/serialize";
import { deforest, Point, newTree, trees } from "../../ast/trees";
import MenuBar from "./MenuBar";
import MenuBarButton from "./MenuBarButton";
import MenuBarTitle from "./MenuBarTitle";

export type Props = {
  onShowHelp: (event: SyntheticEvent) => void;

  rerender: () => void;
};

export default function AppMenuBar({ onShowHelp, rerender }: Props) {
  return (
    <MenuBar>
      <MenuBarTitle>Sparkground</MenuBarTitle>

      <MenuBarButton
        action={() => {
          const source = prompt(
            "THIS WILL OVERWRITE THE CANVAS. Paste exported Sparkground or Scheme code:"
          );
          if (!source) return;

          const exprs = Parser.parseToExprs(source);
          if (!exprs.length) return;

          deforest();

          let location: Point = { x: 0, y: 0 };
          exprs.forEach((expr) => {
            newTree(expr, { ...location });
            location.y += 200;
          });
          rerender();
        }}
      >
        Import
      </MenuBarButton>
      <MenuBarButton
        action={async () => {
          await navigator.clipboard.writeText(
            trees()
              .map((tree) => serializeExpr(tree.root))
              .join("\n")
          );
          alert("Copied to clipboard.");
        }}
      >
        Export
      </MenuBarButton>
      <MenuBarButton action={onShowHelp}>Help</MenuBarButton>
    </MenuBar>
  );
}
