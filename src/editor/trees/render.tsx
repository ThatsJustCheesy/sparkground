import {
  TreeIndexPath,
  extendIndexPath,
  rootIndexPath,
  hole,
  nodeAtIndexPath,
  isHole,
} from "./tree";
import BlockHint from "../blocks/BlockHint";
import { Tree } from "./trees";
import Block, { BlockData } from "../blocks/Block";
import { Over } from "@dnd-kit/core";
import { ProgSymbol, SymbolTable } from "../symbol-table";
import {
  Define,
  Expr,
  Hole,
  If,
  Lambda,
  Call,
  Sequence,
  Var,
  Let,
  NameBinding,
  QuoteExpr,
} from "../../expr/expr";
import { symbols } from "../library/library-defs";
import { TypeInferrer } from "../../typechecker/infer";
import { errorInvolvesExpr } from "../../typechecker/errors";
import { ActiveDrag } from "../Editor";
import { Datum } from "../../datum/datum";

export class Renderer {
  indexPath!: TreeIndexPath;
  isCopySource?: boolean;

  activeDrag?: ActiveDrag;
  forDragOverlay?: boolean | Over;

  onMouseOver?: (symbol: ProgSymbol | number | boolean | undefined) => void;
  onMouseOut?: (symbol: ProgSymbol | number | boolean | undefined) => void;
  onContextMenu?: (indexPath: TreeIndexPath) => void;

  rerender?: () => void;
  renderCounter?: number;

  constructor(
    private tree: Tree,
    private symbolTable: SymbolTable,
    private inferrer: TypeInferrer,
    options: {
      activeDrag?: ActiveDrag;
      forDragOverlay?: boolean | Over;

      onMouseOver?: (symbol: ProgSymbol | number | boolean | undefined) => void;
      onMouseOut?: (symbol: ProgSymbol | number | boolean | undefined) => void;
      onContextMenu?: (indexPath: TreeIndexPath) => void;

      rerender?: () => void;
      renderCounter?: number;
    }
  ) {
    this.activeDrag = options.activeDrag;
    this.forDragOverlay = options.forDragOverlay;

    this.onMouseOver = options.onMouseOver;
    this.onMouseOut = options.onMouseOut;
    this.onContextMenu = options.onContextMenu;

    this.rerender = options.rerender;
    this.renderCounter = options.renderCounter;
  }

  render(
    node: Expr | Datum,
    {
      indexPath,
      isCopySource,
    }: {
      indexPath?: TreeIndexPath;
      isCopySource?: boolean;
    } = {}
  ) {
    if (indexPath) this.indexPath = indexPath;
    if (!this.indexPath) {
      if (node !== this.tree.root) {
        throw "programmer error: must provide index path to render a subexpression!";
      }
      this.indexPath = rootIndexPath(this.tree);
    }

    if (isCopySource) this.isCopySource = isCopySource;

    switch (node.kind) {
      case "bool":
      case "number":
      case "string":
      case "symbol":
      case "list":
        return this.#renderDatum(node);
      default:
        return this.#renderExpr(node);
    }
  }

  #renderExpr(expr: Expr): JSX.Element {
    switch (expr.kind) {
      case "number":
      case "bool":
      case "string":
      case "symbol":
        return this.#renderDatum(expr);

      case "name-binding":
      case "var":
        return this.#renderIdentifier(expr);

      case "quote":
        return this.#renderQuote(expr);

      case "call":
        return this.#renderCall(expr);

      case "define":
        return this.#renderDefine(expr);
      case "let":
        return this.#renderLet(expr);
      case "lambda":
        return this.#renderLambda(expr);
      case "sequence":
        return this.#renderSequence(expr);

      case "if":
        return this.#renderIf(expr);
      case "cond":
        throw "TODO";
    }
  }

  #block(data: BlockData, body: JSX.Element | JSX.Element[] = []) {
    return this.#subnodeBlock(data, body);
  }

  #subnodeBlock(data: BlockData, body: JSX.Element | JSX.Element[]) {
    const key = this.#keyForIndexPath(this.indexPath);
    const expr = nodeAtIndexPath(this.indexPath);
    return (
      <Block
        key={key}
        id={key}
        indexPath={this.indexPath}
        data={data}
        isCopySource={this.isCopySource}
        inferrer={this.inferrer}
        hasError={
          this.inferrer.error && errorInvolvesExpr(this.inferrer.error, expr as Expr /* TODO */)
        }
        activeDrag={this.activeDrag}
        forDragOverlay={this.forDragOverlay}
        onMouseOver={this.onMouseOver}
        onMouseOut={this.onMouseOut}
        onContextMenu={this.onContextMenu}
        rerender={this.rerender}
        renderCounter={this.renderCounter}
      >
        {body}
      </Block>
    );
  }

  #renderSubexpr(
    subexpr: Expr,
    index: number,
    { isCopySource }: { isCopySource?: boolean } = {}
  ): JSX.Element {
    const parentIndexPath = this.indexPath;
    const parentIsCopySource = this.isCopySource;

    this.indexPath = extendIndexPath(this.indexPath, index);
    this.isCopySource = this.isCopySource || isCopySource;

    const rendered = this.#renderExpr(subexpr);

    this.indexPath = parentIndexPath;
    this.isCopySource = parentIsCopySource;
    return rendered;
  }

  #renderDatum(datum: Datum | Hole): JSX.Element {
    switch (datum.kind) {
      case "bool":
        return this.#block({ type: "bool", value: datum.value });
      case "number":
        return this.#block({ type: "number", value: datum.value });
      case "string":
        throw "TODO";
      case "symbol":
        if (datum.value === "·") return this.#block({ type: "hole" });
        return this.#block({ type: "ident", symbol: { id: datum.value } });
      case "list":
        const heads = datum.heads;
        // Remove holes from the end
        while (isHole(heads.at(-1))) {
          heads.pop();
        }
        const children = heads.map((head, index) => this.#renderSubdatum(head, index + 1));

        const tail = datum.tail ? this.#renderSubdatum(datum.tail, 0) : undefined;

        return this.#block({ type: "hlist", tail }, children);
    }
  }

  #renderSubdatum(
    subdatum: Datum,
    index: number,
    { isCopySource }: { isCopySource?: boolean } = {}
  ) {
    const parentIndexPath = this.indexPath;
    const parentIsCopySource = this.isCopySource;

    this.indexPath = extendIndexPath(this.indexPath, index);
    this.isCopySource = this.isCopySource || isCopySource;

    const rendered = this.#renderDatum(subdatum);

    this.indexPath = parentIndexPath;
    this.isCopySource = parentIsCopySource;
    return rendered;
  }

  #renderIdentifier(expr: NameBinding | Var): JSX.Element {
    const data = ((): BlockData => {
      switch (expr.kind) {
        case "name-binding":
        case "var":
          return {
            type: "ident",
            symbol: this.symbolTable.get(expr.id),
            isNameBinding: expr.kind === "name-binding",
          };
      }
    })();

    return this.#block(data);
  }

  #renderQuote(quote: QuoteExpr): JSX.Element {
    return this.#block({ type: "quote" }, [this.#renderSubdatum(quote.value, 0)]);
  }

  #hintBodyArgs(bodyArgs: JSX.Element[], hints: string[] = []) {
    return bodyArgs.map((bodyArg, index) => {
      const hint = hints[index];
      if (!hint) return bodyArg;

      const argIndexPath = extendIndexPath(this.indexPath, index);
      return (
        <BlockHint key={this.#keyForIndexPath(argIndexPath)} hint={hint}>
          {bodyArg}
        </BlockHint>
      );
    });
  }

  #renderCall(expr: Call): JSX.Element {
    let { called, args } = expr;

    if (called.kind === "var") {
      const calledSymbol = this.symbolTable.get(called.id);
      const minArgCount = calledSymbol.minArgCount ?? 0;

      // Add holes where arguments are required
      while (args.length < minArgCount) {
        args.push(hole);
      }

      // Remove holes from the end of varargs calls
      while (args.length > minArgCount && isHole(args.at(-1))) {
        args.pop();
      }
    }

    const renderedArgs = args.map((arg, index) => this.#renderSubexpr(arg, index + 1));

    if (called.kind === "var") {
      const calledSymbol = this.symbolTable.get(called.id);
      if (calledSymbol.headingArgCount || calledSymbol.bodyArgHints?.length) {
        const { headingArgCount, bodyArgHints } = calledSymbol;

        const heading = headingArgCount ? renderedArgs.slice(0, headingArgCount) : [];
        const body = renderedArgs.slice(headingArgCount);

        return this.#block(
          { type: "v", symbol: calledSymbol, heading: <>{heading}</> },
          this.#hintBodyArgs(body, bodyArgHints)
        );
      }

      return this.#block({ type: "h", symbol: calledSymbol }, renderedArgs);
    } else {
      throw "calling non-identifier is not supported yet";
    }
  }

  #renderDefine(expr: Define): JSX.Element {
    const heading = this.#renderSubexpr(expr.name, 0, { isCopySource: true });
    const body = this.#renderSubexpr(expr.value, 1);

    return this.#block({ type: "v", symbol: symbols.define, heading }, body);
  }

  #renderLet(expr: Let): JSX.Element {
    const heading = (
      <>
        {expr.bindings.map(([name, value], index) => (
          <>
            {this.#renderSubexpr(name, 2 * index, { isCopySource: true })}
            {this.#renderSubexpr(value, 2 * index + 1)}
          </>
        ))}
      </>
    );
    const body = this.#renderSubexpr(expr.body, 2 * expr.bindings.length);

    return this.#block({ type: "v", symbol: symbols.let, heading }, body);
  }

  #renderLambda(expr: Lambda): JSX.Element {
    const heading = (
      <>
        {expr.params.map((param, index) =>
          this.#renderSubexpr(param, index, { isCopySource: true })
        )}
      </>
    );
    const body = this.#renderSubexpr(expr.body, expr.params.length);

    return this.#block({ type: "v", symbol: symbols.lambda, heading }, body);
  }

  #renderSequence(expr: Sequence): JSX.Element {
    // TODO: Real editable sequence block!
    return <>{expr.exprs.map((subexpr, index) => this.#renderSubexpr(subexpr, index))}</>;
  }

  #renderIf(expr: If): JSX.Element {
    return this.#block(
      { type: "v", symbol: symbols.if, heading: this.#renderSubexpr(expr.if, 0) },
      this.#hintBodyArgs(
        [this.#renderSubexpr(expr.then, 1), this.#renderSubexpr(expr.else, 2)],
        ["then", "else"]
      )
    );
  }

  #keyForIndexPath({ path }: TreeIndexPath) {
    return this.tree.id + " " + path.join(" ");
  }
}
