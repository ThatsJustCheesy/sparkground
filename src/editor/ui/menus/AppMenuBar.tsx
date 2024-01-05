import { SyntheticEvent } from "react";
import { Parser } from "../../../expr/parse";
import { serializeExpr } from "../../trees/serialize";
import { deforest, Point, newTree, trees } from "../../trees/trees";
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
        action={async () => {
          const continue_ = confirm(
            "This will import Sparkground or Scheme code from your clipboard, and WILL OVERWRITE THE CANVAS. Continue?"
          );
          if (!continue_) return;

          await new Promise((resolve) => {
            setTimeout(resolve, 200);
          });

          const source = await navigator.clipboard.readText();

          const exprs = Parser.parseToExprsWithAttributes(source);
          if (!exprs.length) return;

          deforest();

          let location: Point = { x: 0, y: 0 };
          exprs.forEach((expr) => {
            if (expr.kind === "define" && expr.attributes?.location) {
              location = expr.attributes.location;
            }
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
              .map((tree) => {
                if (tree.root.kind === "define") {
                  tree.root.attributes = tree.root.attributes ?? {};
                  tree.root.attributes.location = tree.location;
                }
                return serializeExpr(tree.root);
              })
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
