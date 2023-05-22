import "./menu-bar.css";
import { PropsWithChildren } from "react";

export type Props = PropsWithChildren<{}>;

export default function MenuBar({ children }: Props) {
  return <div className="menu-bar">{children}</div>;
}
