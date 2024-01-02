import { createContext } from "react";
import { ActiveDrag } from "./Editor";
import { ProgSymbol } from "./symbol-table";
import { TreeIndexPath } from "./trees/tree";

export const ActiveDragContext = createContext<ActiveDrag | undefined>(undefined);

export type CallbacksContext = {
  onMouseOver?: (symbol: ProgSymbol | number | boolean | undefined) => void;
  onMouseOut?: (symbol: ProgSymbol | number | boolean | undefined) => void;
  onContextMenu?: (indexPath: TreeIndexPath) => void;
};

export const CallbacksContext = createContext<CallbacksContext>({});

export const RerenderContext = createContext<(() => void) | undefined>(undefined);
export const RenderCounterContext = createContext<number | undefined>(undefined);
