import { symbols } from "./library/library-defs";

export class SymbolTable {
  #symbols: Map<string, ProgSymbol> = new Map();

  constructor() {
    Object.values(symbols).forEach((symbol) => this.#symbols.set(symbol.id, symbol));
  }

  get(name: string): ProgSymbol {
    const existing = this.#symbols.get(name);
    if (existing) return existing;

    const new_ = {
      id: name,
    };
    this.#symbols.set(name, new_);
    return new_;
  }
}

export type ProgSymbol = {
  id: string;
  doc?: string | JSX.Element;

  headingArgCount?: number;
  bodyArgHints?: string[];

  special?: "define";
};
