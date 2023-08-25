import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  hint: string;
}>;

export default function BlockHint({ hint, children }: Props) {
  return (
    <div className="block-v-hinted">
      <div className="block-v-hint">{hint}</div>
      {children}
    </div>
  );
}
