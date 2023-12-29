import { TreeIndexPath, extendIndexPath, rootIndexPath, hole, exprAtIndexPath } from "./ast";
import BlockHint from "../blocks/BlockHint";
import { Tree } from "./trees";
import Block, { BlockData } from "../blocks/Block";
import { Over } from "@dnd-kit/core";
import { ProgSymbol, SymbolTable } from "../symbol-table";
import {
  BoolExpr,
  Define,
  Expr,
  Hole,
  If,
  Lambda,
  NumberExpr,
  Call,
  Sequence,
  StringExpr,
  Var,
  Let,
  NameBinding,
} from "../../typechecker/ast/ast";
import { symbols } from "../library/library-defs";
import { TypeInferrer } from "../../typechecker/infer";
import { errorInvolvesExpr } from "../../typechecker/errors";
import { ActiveDrag } from "../Editor";

export function render(
  tree: Tree,
  node: Expr,
  symbolTable: SymbolTable,
  {
    indexPath: indexPath_,

    isCopySource,

    inferrer: inferrer_,

    activeDrag,
    forDragOverlay,

    onMouseOver,
    onMouseOut,
    onContextMenu,

    rerender,
    renderCounter,
  }: {
    indexPath?: TreeIndexPath;

    isCopySource?: boolean;

    inferrer?: TypeInferrer;

    activeDrag?: ActiveDrag;
    forDragOverlay?: boolean | Over;

    onMouseOver?: (symbol: ProgSymbol | number | boolean | undefined) => void;
    onMouseOut?: (symbol: ProgSymbol | number | boolean | undefined) => void;
    onContextMenu?: (indexPath: TreeIndexPath) => void;

    rerender?: () => void;
    renderCounter?: number;
  } = {}
): JSX.Element {
  if (node !== tree.root && !indexPath_)
    throw "programmer error: must provide index path to render a subexpression!";

  const indexPath = indexPath_ ?? rootIndexPath(tree);
  const inferrer = inferrer_ ?? new TypeInferrer();

  function keyForIndexPath({ path }: TreeIndexPath) {
    return tree.id + " " + path.join(" ");
  }

  function block(data: BlockData, body: JSX.Element | JSX.Element[] = []) {
    return subnodeBlock(data, body, indexPath);
  }
  function subnodeBlock(
    data: BlockData,
    body: JSX.Element | JSX.Element[],
    indexPath: TreeIndexPath
  ) {
    const key = keyForIndexPath(indexPath);
    const expr = exprAtIndexPath(indexPath);
    return (
      <Block
        key={key}
        id={key}
        indexPath={indexPath}
        data={data}
        isCopySource={isCopySource}
        inferrer={inferrer}
        hasError={inferrer.error && errorInvolvesExpr(inferrer.error, expr)}
        activeDrag={activeDrag}
        forDragOverlay={forDragOverlay}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
        onContextMenu={onContextMenu}
        rerender={rerender}
        renderCounter={renderCounter}
      >
        {body}
      </Block>
    );
  }
  function renderSubexpr(subexpr: Expr, index: number, options: { isCopySource?: boolean } = {}) {
    return render(tree, subexpr, symbolTable, {
      indexPath: extendIndexPath(indexPath, index),

      isCopySource: isCopySource || options.isCopySource,

      inferrer,

      activeDrag,

      onMouseOver,
      onMouseOut,
      onContextMenu,

      rerender,
    });
  }

  function renderAtomic(
    expr: Hole | NameBinding | NumberExpr | BoolExpr | StringExpr | Var
  ): JSX.Element {
    const data = ((): BlockData => {
      switch (expr.kind) {
        case "hole":
          return { type: "hole" };
        case "number":
          return { type: "number", value: expr.value };
        case "bool":
          return { type: "bool", value: expr.value };
        case "string":
          throw "TODO!";
        case "name-binding":
        case "var":
          return {
            type: "ident",
            symbol: symbolTable.get(expr.id),
            isNameBinding: expr.kind === "name-binding",
          };
      }
    })();

    return block(data);
  }

  function hintBodyArgs(bodyArgs: JSX.Element[], hints: string[] = []) {
    return bodyArgs.map((bodyArg, index) => {
      const hint = hints[index];
      if (!hint) return bodyArg;

      const argIndexPath = extendIndexPath(indexPath, index);
      return (
        <BlockHint key={keyForIndexPath(argIndexPath)} hint={hint}>
          {bodyArg}
        </BlockHint>
      );
    });
  }

  function renderCall(expr: Call): JSX.Element {
    let { called, args } = expr;

    if (called.kind === "var") {
      const calledSymbol = symbolTable.get(called.id);
      const minArgCount = calledSymbol.minArgCount ?? 0;

      // Add holes where arguments are required
      while (args.length < minArgCount) {
        args.push(hole);
      }

      // Remove holes from the end of varargs calls
      while (args.length > minArgCount && args.at(-1)?.kind === "hole") {
        args.pop();
      }
    }

    const renderedArgs = args.map((arg, index) => renderSubexpr(arg, index + 1));

    if (called.kind === "var") {
      const calledSymbol = symbolTable.get(called.id);
      if (calledSymbol.headingArgCount || calledSymbol.bodyArgHints?.length) {
        const { headingArgCount, bodyArgHints } = calledSymbol;

        const heading = headingArgCount ? renderedArgs.slice(0, headingArgCount) : [];
        const body = renderedArgs.slice(headingArgCount);

        return block(
          { type: "v", symbol: calledSymbol, heading: <>{heading}</> },
          hintBodyArgs(body, bodyArgHints)
        );
      }

      return block({ type: "h", symbol: calledSymbol }, renderedArgs);
    } else {
      throw "calling non-identifier is not supported yet";
    }
  }

  function renderDefine(expr: Define): JSX.Element {
    const heading = renderSubexpr(expr.name, 0, { isCopySource: true });
    const body = renderSubexpr(expr.value, 1);

    return block({ type: "v", symbol: symbols.define, heading }, body);
  }

  function renderLet(expr: Let): JSX.Element {
    const heading = (
      <>
        {expr.bindings.map(([name, value], index) => (
          <>
            {renderSubexpr(name, 2 * index, { isCopySource: true })}
            {renderSubexpr(value, 2 * index + 1)}
          </>
        ))}
      </>
    );
    const body = renderSubexpr(expr.body, 2 * expr.bindings.length);

    return block({ type: "v", symbol: symbols.let, heading }, body);
  }

  function renderLambda(expr: Lambda): JSX.Element {
    const heading = (
      <>{expr.params.map((param, index) => renderSubexpr(param, index, { isCopySource: true }))}</>
    );
    const body = renderSubexpr(expr.body, expr.params.length);

    return block({ type: "v", symbol: symbols.lambda, heading }, body);
  }

  function renderSequence(expr: Sequence): JSX.Element {
    // TODO: Real editable sequence block!
    return <>{expr.exprs.map((subexpr, index) => renderSubexpr(subexpr, index))}</>;
  }

  function renderIf(expr: If): JSX.Element {
    return block(
      { type: "v", symbol: symbols.if, heading: renderSubexpr(expr.if, 0) },
      hintBodyArgs([renderSubexpr(expr.then, 1), renderSubexpr(expr.else, 2)], ["then", "else"])
    );
  }

  switch (node.kind) {
    case "hole":
    case "name-binding":
    case "number":
    case "bool":
    case "string":
    case "var":
      return renderAtomic(node);

    case "quote":
      throw "TODO";
    // return renderQuote(node);

    case "call":
      return renderCall(node);

    case "define":
      return renderDefine(node);
    case "let":
      return renderLet(node);
    case "lambda":
      return renderLambda(node);
    case "sequence":
      return renderSequence(node);

    case "if":
      return renderIf(node);
    case "cond":
      throw "TODO";
  }
}
