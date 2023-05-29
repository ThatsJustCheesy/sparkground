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

export function renderExpr(
  tree: Tree,
  expr: Expr,
  {
    indexPath: indexPath_,
    isCopySource,
    isSymbolDefinition,
  }: {
    indexPath?: TreeIndexPath;
    isCopySource?: boolean;
    isSymbolDefinition?: boolean;
  } = {}
): JSX.Element {
  const indexPath = indexPath_ ?? rootIndexPath(tree);
  isCopySource ||= isSymbolDefinition;

  function keyForIndexPath({ path }: TreeIndexPath) {
    return tree.id + " " + path.join(" ");
  }

  if (isSExpr(expr)) {
    const { called, args } = expr;

    const renderedArgs = args.map((arg, index) =>
      renderExpr(tree, arg, {
        indexPath: extendIndexPath(indexPath, index + 1),
        isCopySource: isCopySource,
        isSymbolDefinition:
          isSymbolDefinition ||
          (index === 0 && isProgSymbol(called) && called.special === "define"),
      })
    );

    if (isProgSymbol(called)) {
      if (!isCopySource && (called.headingArgCount || called.bodyArgHints?.length)) {
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
            isCopySource={isCopySource}
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
          data={{ type: "h", symbol: called }}
          isCopySource={isCopySource}
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
        isCopySource={isCopySource}
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
        isCopySource={isCopySource}
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
        isCopySource={isCopySource}
      />
    );
  } else {
    throw "invalid expression";
  }
}
