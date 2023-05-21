export type ProgSymbol = {
  id: string;
  doc?: string | JSX.Element;

  headingArgCount?: number;
  bodyArgHints?: string[];

  special?: "define";
};
