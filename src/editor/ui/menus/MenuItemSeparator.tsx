import { ContextMenuItem } from "rctx-contextmenu";

export type Props = {};

export default function MenuItemSeparator({}: Props) {
  return <ContextMenuItem disabled className="menu-item-separator"></ContextMenuItem>;
}
