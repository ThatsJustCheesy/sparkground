import { TreeIndexPath, extendIndexPath, hole, isHole, nodeAtIndexPath } from "./tree";
import BlockHint from "../blocks/BlockHint";
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
  And,
  Or,
} from "../../expr/expr";
import { Datum } from "../../datum/datum";
import { memo } from "react";
import { Environment, extendEnv } from "../library/environments";
import {
  Type,
  TypeVarSlot,
  functionMinArgCount,
  hasTag,
  isForallType,
  isTypeNameBinding,
  isTypeNameHole,
  isTypeVar,
  typeParams,
} from "../../typechecker/type";
import { Typechecker } from "../../typechecker/typecheck";

const BlockMemo = memo(Block);

export class Renderer {
  indexPath!: TreeIndexPath;
  isCopySource?: boolean;

  forDragOverlay?: boolean | Over;

  onEditValue?: (indexPath: TreeIndexPath) => Promise<void>;

  constructor(
    private environment: Environment<unknown>,
    private typechecker: Typechecker,
    options: {
      forDragOverlay?: boolean | Over;
      onEditValue?: (indexPath: TreeIndexPath) => Promise<void>;
    } = {}
  ) {
    this.forDragOverlay = options.forDragOverlay;
    this.onEditValue = options.onEditValue;
  }

  render(
    indexPath: TreeIndexPath,
    {
      isCopySource,
    }: {
      isCopySource?: boolean;
    } = {}
  ) {
    this.indexPath = indexPath;
    if (isCopySource) this.isCopySource = isCopySource;

    this.typechecker.clearCache();
    this.typechecker.inferType(indexPath.tree);

    const node = nodeAtIndexPath(indexPath);
    switch (node.kind) {
      case "Boolean":
      case "Number":
      case "String":
      case "Symbol":
      case "List":
        return this.#renderDatum(node);
      default:
        return this.#renderExpr(node);
    }
  }

  #renderExpr(expr: Expr): JSX.Element {
    switch (expr.kind) {
      case "Number":
      case "Boolean":
      case "String":
      case "Symbol":
      case "List":
        return this.#renderDatum(expr);

      case "type":
        return this.#renderType(expr.type);

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

      case "and":
      case "or":
        return this.#renderAndOr(expr);
      case "if":
        return this.#renderIf(expr);
      case "cond":
        throw "TODO";
    }
  }

  #block(data: BlockData, body: JSX.Element | JSX.Element[] = []) {
    const key = this.#keyForIndexPath(this.indexPath);

    const binding = "binding" in data ? data.binding : undefined;
    return (
      <BlockMemo
        key={key}
        id={key}
        indexPath={this.indexPath}
        data={data}
        isCopySource={this.isCopySource}
        typechecker={this.typechecker}
        identifierTag={
          binding?.attributes?.binder
            ? this.#keyForIndexPath(binding.attributes.binder).trim().replace(/\s/g, "-").trim()
            : undefined
        }
        forDragOverlay={this.forDragOverlay}
        onEditValue={this.onEditValue}
      >
        {body}
      </BlockMemo>
    );
  }

  #renderVarSlot(
    varSlot: VarSlot,
    index: number,
    { environment, phantom }: { environment?: Environment<unknown>; phantom?: boolean } = {}
  ): JSX.Element {
    const parentIndexPath = this.indexPath;
    const parentIsCopySource = this.isCopySource;
    const parentEnvironment = this.environment;

    this.indexPath = extendIndexPath(this.indexPath, index);
    this.isCopySource = true;
    this.environment = environment ?? this.environment;

    const rendered = isHole(varSlot)
      ? this.#block({ type: "name-hole", phantom })
      : this.#renderNameBinding(varSlot);

    this.indexPath = parentIndexPath;
    this.isCopySource = parentIsCopySource;
    this.environment = parentEnvironment;
    return rendered;
  }

  #renderSubexpr(
    subexpr: Expr,
    index: number,
    {
      isCopySource,
      environment,
    }: { isCopySource?: boolean; environment?: Environment<unknown> } = {}
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
      case "Boolean":
        return this.#block({ type: "bool", value: datum.value });
      case "Number":
        return this.#block({ type: "number", value: datum.value });
      case "String":
        return this.#block({ type: "string", value: datum.value });
      case "Symbol":
        if (datum.value === "·") return this.#block({ type: "hole" });
        return this.#block({ type: "symbol", id: datum.value });
      case "List":
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

  #renderType(type: Type): JSX.Element {
    if (isTypeVar(type)) {
      return this.#block({
        type: "type-var",
        id: type.var,
      });
    } else if (isTypeNameBinding(type)) {
      // Rendered standalone, this is a *drag overlay* for a type name binding
      return this.#block({
        type: "type-var",
        id: type.id,
      });
    } else if (isTypeNameHole(type)) {
      return this.#block({
        type: "type-name-hole",
      });
    } else if (isForallType(type)) {
      // TODO: Render something different?
      return this.#block(
        {
          type: "type",
          id: "All",
        },
        [
          ...type.forall.map((typeVar, index) => this.#renderTypeVarSlot(typeVar, index)),
          this.#renderTypeArg(type.body, type.forall.length),
        ]
      );
    } else {
      return this.#block(
        {
          type: "type",
          id: type.tag === "Any" ? "?" : type.tag,
        },
        typeParams(type).map((typeArg, index) => this.#renderTypeArg(typeArg, index))
      );
    }
  }

  #renderTypeArg(typeArg: Type, index: number) {
    const parentIndexPath = this.indexPath;
    const parentIsCopySource = this.isCopySource;

    this.indexPath = extendIndexPath(this.indexPath, index);
    this.isCopySource = false;

    const rendered = this.#renderType(typeArg);

    this.indexPath = parentIndexPath;
    this.isCopySource = parentIsCopySource;
    return rendered;
  }

  #renderIdentifier(expr: NameBinding | Var): JSX.Element {
    return this.#block({
      type: "ident",
      id: expr.id,
      binding: this.environment[expr.id],
    });
  }

  #renderTypeVarSlot(typeVarSlot: TypeVarSlot, index: number): JSX.Element {
    const parentIndexPath = this.indexPath;
    const parentIsCopySource = this.isCopySource;

    this.indexPath = extendIndexPath(this.indexPath, index);
    this.isCopySource = true;

    const rendered = isTypeNameHole(typeVarSlot)
      ? this.#block({ type: "type-name-hole" })
      : this.#block({
          type: "type-name-binding",
          id: typeVarSlot.id,
        });

    this.indexPath = parentIndexPath;
    this.isCopySource = parentIsCopySource;
    return rendered;
  }

  #renderNameBinding(nb: NameBinding) {
    const { id } = nb;
    const binding = this.environment[id]!;

    const body: JSX.Element = nb.type ? (
      <>
        <span style={{ marginLeft: "-0.2em", marginRight: "-0.05em" }}>:</span>
        {this.#renderTypeArg(nb.type, 0)}
      </>
    ) : (
      <></>
    );

    return this.#block(
      {
        type: "name-binding",
        id,
        binding,
      },
      body
    );
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

    const resultType = this.typechecker.inferType(expr);

    if (called.kind === "var") {
      const calledType = this.typechecker.inferType(called);
      const minArgCount = functionMinArgCount(calledType) ?? 0;

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
      const calledAttributes = calledBinding?.attributes ?? {};

      const { headingArgCount, bodyArgHints } = calledAttributes;

      const heading = headingArgCount ? renderedArgs.slice(0, headingArgCount) : [];
      const body = renderedArgs.slice(headingArgCount);

      if (resultType && hasTag(resultType, "Empty")) {
        return this.#block(
          {
            type: "hat",
            id: called.id,
            binding: calledBinding,
            heading: <>{heading}</>,
            calledIsVar: true,
          },
          this.#hintBodyArgs(body, bodyArgHints)
        );
      } else if (calledAttributes?.headingArgCount || calledAttributes?.bodyArgHints?.length) {
        return this.#block(
          {
            type: "v",
            id: called.id,
            binding: calledBinding,
            heading: <>{heading}</>,
            calledIsVar: true,
          },
          this.#hintBodyArgs(body, bodyArgHints)
        );
      } else {
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
          renderedArgs
        );
      }
    } else {
      const renderedCalled = this.#renderSubexpr(called, 0);
      return this.#block({ type: "happly" }, [renderedCalled, ...renderedArgs]);
    }
  }

  #renderDefine(expr: Define): JSX.Element {
    this.environment = this.#extendedEnvironment([expr.name]);

    const heading = this.#renderVarSlot(expr.name, 0);
    const body = this.#renderSubexpr(expr.value, 1);

    return this.#block({ type: "hat", id: "define", heading }, body);
  }

  #renderLet(expr: Let): JSX.Element {
    const newEnvironment = this.#extendedEnvironment(expr.bindings.map(([name]) => name));

    const heading = (
      <>
        {expr.bindings.map(([name, value], index) => (
          <>
            {this.#renderVarSlot(name, 2 * index, {
              environment: newEnvironment,
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
            {this.#renderVarSlot(name, 2 * index, {
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
          this.#renderVarSlot(param, index, {
            environment: newEnvironment,
          })
        )}
        {
          // Phantom "+" button (name hole) at the end
          !this.isCopySource &&
            !this.forDragOverlay &&
            this.#renderVarSlot(hole, expr.params.length, {
              environment: newEnvironment,
              phantom: true,
            })
        }
      </>
    );
    const body = this.#renderSubexpr(expr.body, expr.params.length + 1, {
      environment: newEnvironment,
    });

    return this.#block({ type: "v", id: "function", heading }, body);
  }

  #renderSequence(expr: Sequence): JSX.Element {
    // TODO: Real editable sequence block!
    return <>{expr.exprs.map((subexpr, index) => this.#renderSubexpr(subexpr, index))}</>;
  }

  #renderAndOr(expr: And | Or): JSX.Element {
    const args = expr.args;
    // Remove holes from the end
    while (isHole(args.at(-1))) {
      args.pop();
    }

    return this.#block(
      { type: "h", id: expr.kind },
      expr.args.map((arg, index) => this.#renderSubexpr(arg, index))
    );
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

  #keyForIndexPath({ tree, path }: TreeIndexPath) {
    return tree.id + " " + path.join(" ");
  }

  #extendedEnvironment(varSlots: VarSlot[]) {
    return extendEnv(this.environment, this.indexPath, varSlots);
  }
}
