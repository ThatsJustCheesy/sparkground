import { createContext } from "react";
import { ActiveDrag } from "./Editor";
import { TreeIndexPath } from "./trees/tree";

export const ActiveDragContext = createContext<ActiveDrag | undefined>(undefined);

export type OnContextMenu = (indexPath: TreeIndexPath) => void;
export const OnContextMenuContext = createContext<OnContextMenu | undefined>(undefined);

export type Rerender = () => void;
export const RerenderContext = createContext<Rerender | undefined>(undefined);
export const RenderCounterContext = createContext<number | undefined>(undefined);
