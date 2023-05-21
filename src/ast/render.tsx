import {
  Expr,
  TreeIndexPath,
  extendIndexPath,
  isHole,
  isNumericLiteral,
  isProgSymbol,
  isQuoteLiteral,
  isSExpr,
  rootIndexPath,
} from "./ast";
import BlockIdent from "../blocks/BlockIdent";
import BlockV from "../blocks/BlockV";
import BlockH from "../blocks/BlockH";
import BlockHint from "../blocks/BlockHint";
import BlockHole from "../blocks/BlockHole";
import { Tree } from "./trees";

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
          <BlockV
            key={key}
            id={key}
            indexPath={indexPath}
            symbol={called}
            heading={<>{heading}</>}
            isCopySource={isCopySource}
          >
            {hintedBody}
          </BlockV>
        );
      }

      const key = keyForIndexPath(indexPath);
      return (
        <BlockH
          key={key}
          id={key}
          indexPath={indexPath}
          symbol={called}
          definesSymbol={isSymbolDefinition}
          isCopySource={isCopySource}
        >
          {renderedArgs}
        </BlockH>
      );
    }

    throw "calling non-identifier is not supported yet";
  } else if (isProgSymbol(expr)) {
    const key = keyForIndexPath(indexPath);
    return (
      <BlockIdent
        key={key}
        id={key}
        indexPath={indexPath}
        symbol={expr}
        definesSymbol={isSymbolDefinition}
        isCopySource={isCopySource}
      />
    );
  } else if (isNumericLiteral(expr)) {
    throw "numeric literal not supported yet";
  } else if (isQuoteLiteral(expr)) {
    throw "quote literal not supported yet";
  } else if (isHole(expr)) {
    const key = keyForIndexPath(indexPath);
    return <BlockHole key={key} id={key} indexPath={indexPath} />;
  } else {
    throw "invalid expression";
  }
}
