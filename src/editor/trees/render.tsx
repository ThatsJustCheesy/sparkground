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
  Letrec,
  VarSlot,
} from "../../expr/expr";
import { TypeInferrer } from "../../typechecker/infer";
import { errorInvolvesExpr } from "../../typechecker/errors";
import { Datum } from "../../datum/datum";
import { memo } from "react";
import { Binding, Environment, makeEnv, mergeEnvs } from "../library/environments";
import { Value } from "../../evaluator/value";

const BlockMemo = memo(Block);

export class Renderer {
  indexPath!: TreeIndexPath;
  isCopySource?: boolean;

  forDragOverlay?: boolean | Over;

  constructor(
    private tree: Tree,
    private environment: Environment,
    private inferrer: TypeInferrer,
    options: {
      forDragOverlay?: boolean | Over;
    } = {}
  ) {
    this.forDragOverlay = options.forDragOverlay;
  }

  render(
    node: Expr,
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
      case "list":
        return this.#renderDatum(expr);

      case "name-binding":
      case "var":
        return this.#renderIdentifier(expr);

      case "call":
        return this.#renderCall(expr);

      case "define":
        return this.#renderDefine(expr);
      case "let":
        return this.#renderLet(expr);
      case "letrec":
        return this.#renderLetrec(expr);
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

  #block(
    data: BlockData,
    body: JSX.Element | JSX.Element[] = [],
    { binding }: { binding?: Binding<Value> } = {}
  ) {
    const key = this.#keyForIndexPath(this.indexPath);
    const expr = nodeAtIndexPath(this.indexPath);

    return (
      <BlockMemo
        key={key}
        id={key}
        indexPath={this.indexPath}
        data={data}
        isCopySource={this.isCopySource}
        inferrer={this.inferrer}
        hasError={
          this.inferrer.error && errorInvolvesExpr(this.inferrer.error, expr as Expr /* TODO */)
        }
        identifierTag={
          binding?.attributes?.binder
            ? this.#keyForIndexPath(binding.attributes.binder).trim().replace(/\s/g, "-").trim()
            : undefined
        }
        forDragOverlay={this.forDragOverlay}
      >
        {body}
      </BlockMemo>
    );
  }

  #renderSubexpr(
    subexpr: Expr,
    index: number,
    { isCopySource, environment }: { isCopySource?: boolean; environment?: Environment } = {}
  ): JSX.Element {
    const parentIndexPath = this.indexPath;
    const parentIsCopySource = this.isCopySource;
    const parentEnvironment = this.environment;

    this.indexPath = extendIndexPath(this.indexPath, index);
    this.isCopySource = this.isCopySource || isCopySource;
    this.environment = environment ?? this.environment;

    const rendered = this.#renderExpr(subexpr);

    this.indexPath = parentIndexPath;
    this.isCopySource = parentIsCopySource;
    this.environment = parentEnvironment;
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
        return this.#block({ type: "symbol", id: datum.value });
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
            id: expr.id,
            binding: this.environment[expr.id],
            isNameBinding: expr.kind === "name-binding",
          };
      }
    })();

    return this.#block(data, [], { binding: this.environment[expr.id] });
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
      const calledBinding = this.environment[called.id];
      const calledAttributes = calledBinding?.attributes;

      const minArgCount = calledAttributes?.minArgCount ?? 0;

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
      const calledBinding = this.environment[called.id];
      const calledAttributes = calledBinding?.attributes;

      if (calledAttributes?.headingArgCount || calledAttributes?.bodyArgHints?.length) {
        const { headingArgCount, bodyArgHints } = calledAttributes;

        const heading = headingArgCount ? renderedArgs.slice(0, headingArgCount) : [];
        const body = renderedArgs.slice(headingArgCount);

        return this.#block(
          {
            type: "v",
            id: called.id,
            binding: calledBinding,
            heading: <>{heading}</>,
            calledIsVar: true,
          },
          this.#hintBodyArgs(body, bodyArgHints),
          { binding: this.environment[called.id] }
        );
      }

      if (calledAttributes?.infix) {
        const argCount = renderedArgs.length;
        for (let i = 0; i < argCount - 1; i++) {
          renderedArgs.splice(2 * i + 1, 0, <div className="block-h-label">{called.id}</div>);
        }
      }

      return this.#block(
        {
          type: "h",
          id: called.id,
          binding: calledBinding,
          calledIsVar: true,
          argCount: args.length,
        },
        renderedArgs,
        { binding: this.environment[called.id] }
      );
    } else {
      const renderedCalled = this.#renderSubexpr(called, 0);
      return this.#block({ type: "happly" }, [renderedCalled, ...renderedArgs]);
    }
  }

  #renderDefine(expr: Define): JSX.Element {
    const heading = this.#renderSubexpr(expr.name, 0, { isCopySource: true });
    const body = this.#renderSubexpr(expr.value, 1);

    return this.#block({ type: "v", id: "define", heading }, body);
  }

  #renderLet(expr: Let): JSX.Element {
    const newEnvironment = this.#extendedEnvironment(expr.bindings.map(([name]) => name));

    const heading = (
      <>
        {expr.bindings.map(([name, value], index) => (
          <>
            {this.#renderSubexpr(name, 2 * index, {
              isCopySource: true,
            })}
            {this.#renderSubexpr(value, 2 * index + 1)}
          </>
        ))}
      </>
    );
    const body = this.#renderSubexpr(expr.body, 2 * expr.bindings.length, {
      environment: newEnvironment,
    });

    return this.#block({ type: "v", id: "let", heading }, body);
  }

  #renderLetrec(expr: Letrec): JSX.Element {
    const newEnvironment = this.#extendedEnvironment(expr.bindings.map(([name]) => name));

    const heading = (
      <>
        {expr.bindings.map(([name, value], index) => (
          <>
            {this.#renderSubexpr(name, 2 * index, {
              isCopySource: true,
              environment: newEnvironment,
            })}
            {this.#renderSubexpr(value, 2 * index + 1, {
              environment: newEnvironment,
            })}
          </>
        ))}
      </>
    );
    const body = this.#renderSubexpr(expr.body, 2 * expr.bindings.length, {
      environment: newEnvironment,
    });

    return this.#block({ type: "v", id: "letrec", heading }, body);
  }

  #renderLambda(expr: Lambda): JSX.Element {
    const newEnvironment = this.#extendedEnvironment(expr.params);

    const heading = (
      <>
        {expr.params.map((param, index) =>
          this.#renderSubexpr(param, index, {
            isCopySource: true,
            environment: newEnvironment,
          })
        )}
      </>
    );
    const body = this.#renderSubexpr(expr.body, expr.params.length, {
      environment: newEnvironment,
    });

    return this.#block({ type: "v", id: "lambda", heading }, body);
  }

  #renderSequence(expr: Sequence): JSX.Element {
    // TODO: Real editable sequence block!
    return <>{expr.exprs.map((subexpr, index) => this.#renderSubexpr(subexpr, index))}</>;
  }

  #renderIf(expr: If): JSX.Element {
    return this.#block(
      { type: "v", id: "if", heading: this.#renderSubexpr(expr.if, 0) },
      this.#hintBodyArgs(
        [this.#renderSubexpr(expr.then, 1), this.#renderSubexpr(expr.else, 2)],
        ["then", "else"]
      )
    );
  }

  #keyForIndexPath({ path }: TreeIndexPath) {
    return this.tree.id + " " + path.join(" ");
  }

  #extendedEnvironment(varSlots: VarSlot[]) {
    return mergeEnvs(
      this.environment,
      makeEnv(
        varSlots
          .filter((slot) => slot.kind === "name-binding")
          .map(
            (slot, index): Binding<Value> => ({
              name: (slot as NameBinding).id,
              cell: {},
              attributes: {
                binder: extendIndexPath(this.indexPath, index),
              },
            })
          )
      )
    );
  }
}
