import {
  Expr,
  TreeIndexPath,
  extendIndexPath,
  isBoolLiteral,
  isHole,
  isNumericLiteral,
  isProgSymbol,
  isQuoteLiteral,
  isSExpr,
  rootIndexPath,
} from "./ast";
import BlockHint from "../blocks/BlockHint";
import { Tree } from "./trees";
import Block from "../blocks/Block";
import { Over } from "@dnd-kit/core";
import { ProgSymbol } from "../symbol-table";

export function renderExpr(
  tree: Tree,
  expr: Expr,
  {
    indexPath: indexPath_,

    isCopySource,
    isSymbolDefinition,
    forDragOverlay,

    onMouseOver,
    onMouseOut,
  }: {
    indexPath?: TreeIndexPath;

    isCopySource?: boolean;
    isSymbolDefinition?: boolean;
    forDragOverlay?: boolean | Over;

    onMouseOver?: (symbol: ProgSymbol) => void;
    onMouseOut?: (symbol: ProgSymbol) => void;
  } = {}
): JSX.Element {
  const indexPath = indexPath_ ?? rootIndexPath(tree);
  isCopySource ||= isSymbolDefinition;

  function keyForIndexPath({ path }: TreeIndexPath) {
    return tree.id + " " + path.join(" ");
  }

  if (isSExpr(expr)) {
    const { called, args } = expr;

    const renderedArgs = (isSymbolDefinition ? [called, ...args] : args).map((arg, index) =>
      renderExpr(tree, arg, {
        indexPath: extendIndexPath(indexPath, index + (isSymbolDefinition ? 0 : 1)),

        isCopySource: isCopySource,
        isSymbolDefinition:
          isSymbolDefinition ||
          (index === 0 && isProgSymbol(called) && called.special === "define"),

        onMouseOver,
        onMouseOut,
      })
    );

    if (isProgSymbol(called)) {
      if (!isSymbolDefinition && (called.headingArgCount || called.bodyArgHints?.length)) {
        const { headingArgCount, bodyArgHints } = called;

        const heading = headingArgCount ? renderedArgs.slice(0, headingArgCount) : [];
        const body = renderedArgs.slice(headingArgCount);

        const hintedBody = body.map((bodyArg, index) => {
          const hint = bodyArgHints?.[index];
          if (!hint) return bodyArg;

          const argIndexPath = extendIndexPath(indexPath, index);
          return (
            <BlockHint key={keyForIndexPath(argIndexPath)} hint={hint}>
              {bodyArg}
            </BlockHint>
          );
        });

        const key = keyForIndexPath(indexPath);
        return (
          <Block
            key={key}
            id={key}
            indexPath={indexPath}
            data={{ type: "v", symbol: called, heading: <>{heading}</> }}
            isCopySource={isCopySource || isSymbolDefinition}
            forDragOverlay={forDragOverlay}
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
          >
            {hintedBody}
          </Block>
        );
      }

      const key = keyForIndexPath(indexPath);
      return (
        <Block
          key={key}
          id={key}
          indexPath={indexPath}
          data={{ type: "h", symbol: called, definesSymbol: isSymbolDefinition }}
          isCopySource={isCopySource || isSymbolDefinition}
          forDragOverlay={forDragOverlay}
          onMouseOver={onMouseOver}
          onMouseOut={onMouseOut}
        >
          {renderedArgs}
        </Block>
      );
    }

    throw "calling non-identifier is not supported yet";
  } else if (isProgSymbol(expr)) {
    const key = keyForIndexPath(indexPath);
    return (
      <Block
        key={key}
        id={key}
        indexPath={indexPath}
        data={{ type: "ident", symbol: expr }}
        isCopySource={isCopySource || isSymbolDefinition}
        forDragOverlay={forDragOverlay}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
      />
    );
  } else if (isNumericLiteral(expr)) {
    throw "numeric literal not supported yet";
  } else if (isBoolLiteral(expr)) {
    const key = keyForIndexPath(indexPath);
    return (
      <Block
        key={key}
        id={key}
        indexPath={indexPath}
        data={{ type: "bool", value: expr }}
        isCopySource={isCopySource || isSymbolDefinition}
        forDragOverlay={forDragOverlay}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
      />
    );
  } else if (isQuoteLiteral(expr)) {
    throw "quote literal not supported yet";
  } else if (isHole(expr)) {
    const key = keyForIndexPath(indexPath);
    return (
      <Block
        key={key}
        id={key}
        indexPath={indexPath}
        data={{ type: "hole" }}
        isCopySource={isCopySource || isSymbolDefinition}
        forDragOverlay={forDragOverlay}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
      />
    );
  } else {
    throw "invalid expression";
  }
}
