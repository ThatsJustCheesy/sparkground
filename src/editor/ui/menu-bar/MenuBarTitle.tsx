import { PropsWithChildren } from "react";

export type Props = PropsWithChildren<{}>;

export default function MenuBarTitle({ children }: Props) {
  return <h1 className="menu-bar-title">{children}</h1>;
}
