import { PropsWithChildren, SyntheticEvent } from "react";

export type Props = PropsWithChildren<{
  action: (event: SyntheticEvent) => void;
}>;

export default function MenuBarButton({ children, action }: Props) {
  return (
    <button className="menu-bar-button" onClick={action}>
      {children}
    </button>
  );
}
