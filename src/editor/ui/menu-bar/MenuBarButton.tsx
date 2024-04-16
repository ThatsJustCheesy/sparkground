import { PropsWithChildren, SyntheticEvent } from "react";

export type Props = PropsWithChildren<{
  action: (event: SyntheticEvent) => void;

  className?: string;
}>;

export default function MenuBarButton({ children, action, className }: Props) {
  return (
    <button className={`menu-bar-button ${className}`} onClick={action}>
      {children}
    </button>
  );
}
