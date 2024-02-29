import { Datum } from "../datum/datum";
import { TreeIndexPath, extendIndexPath, isHole, rootIndexPath } from "../editor/trees/tree";
import { Expr, NameBinding } from "../expr/expr";
import {
  ArityMismatch,
  InferenceError,
  InvalidAssignment,
  NotCallable,
  UnboundVariable,
  VariadicArityMismatch,
} from "./errors";
import { Any, Never, Type, functionParamTypes, functionResultType, hasTag } from "./type";
import { Tree, newTree, removeTree } from "../editor/trees/trees";
import { isSubtype, typeJoin } from "./subtyping";

export type TypeContext = Record<string, Type>;

function bindInContext(context: TypeContext, binding: NameBinding): TypeContext {
  return bindInContextWithType(context, binding, binding.type ?? Any);
}
function bindInContextWithType(
  context: TypeContext,
  binding: NameBinding,
  newType: Type
): TypeContext {
  return {
    ...context,
    [binding.id]: newType,
  };
}

class InferenceCache {
  inferred = new Map<string, Type>();

  get({ tree, path }: TreeIndexPath): Type | undefined {
    return this.inferred.get(tree.id + "#" + path.join("."));
  }

  set({ tree, path }: TreeIndexPath, type: Type) {
    this.inferred.set(tree.id + "#" + path.join("."), type);
  }

  clear() {
    this.inferred.clear();
  }
}

export class TypecheckerErrors {
  #errors: Record<string, InferenceError> = {};

  clear() {
    this.#errors = {};
  }

  add(indexPath: TreeIndexPath, error: InferenceError) {
    this.#errors[this.#encode(indexPath)] = error;
  }

  for(indexPath: TreeIndexPath) {
    return this.#errors[this.#encode(indexPath)];
  }

  all() {
    return Object.values(this.#errors);
  }

  #encode(indexPath: TreeIndexPath) {
    return indexPath.tree.id + "#" + indexPath.path.map((x) => `${x}`).join("#");
  }
}

export class Typechecker {
  errors = new TypecheckerErrors();

  #inferenceCache = new InferenceCache();

  /**
   * Wipes the typechecker state clean.
   * all gone
   *
   * This is equivalent to just making a new typechecker, but resetting the state in
   * `inferType()` and co. allows clients to just call them repeatedly on the same instance.
   */
  #reset() {
    // Clear public error state.
    // It is a new day.
    this.errors.clear();

    // Clear cached inferences.
    this.#inferenceCache.clear();
  }

  inferType(tree: Tree, context?: TypeContext): Type;
  inferType(expr: Expr, context?: TypeContext): Type;
  inferType(tree: Tree | Expr, context: TypeContext = {}): Type {
    // If given an `Expr`, stuff it into its own tree before running inference,
    // as inference requires an index path into a tree (to deal with subexpressions).
    let isTempTree = false;
    if (!("root" in tree)) {
      isTempTree = true;
      tree = newTree(tree, { x: -1000, y: -1000 });
    }

    try {
      this.#reset();

      return this.#inferType(tree.root, context, rootIndexPath(tree));
    } finally {
      // If we stuffed the given `Expr` into a temporary tree, ensure we clean that up.
      // Like nothing ever happened. shhh
      if (isTempTree) removeTree(tree);
    }
  }

  inferSubexprType(indexPath: TreeIndexPath, context: TypeContext = {}): Type {
    this.#reset();

    // First, infer the type of the entire tree.
    this.#inferType(indexPath.tree.root, context, rootIndexPath(indexPath.tree));

    // We already computed the type of the entire expression, which visits every subexpression.
    // Thus, the inference cache should know the type of the subexpression pointed to by indexPath.
    let inferredType = this.#inferenceCache.get(indexPath);
    if (!inferredType) {
      console.error("no type in inference cache for index path :(", indexPath);
      return Any;
    }

    return inferredType;
  }

  #inferType(expr: Expr, context: TypeContext, indexPath: TreeIndexPath): Type {
    // If the type is cached, we're done.
    const alreadyInferred = this.#inferenceCache.get(indexPath);
    if (alreadyInferred) return alreadyInferred;

    let inferred: Type;
    try {
      inferred = this.#inferType_(expr, context, indexPath);
    } catch (error) {
      if (typeof error === "object" && "tag" in error) {
        this.errors.add(indexPath, error as InferenceError);
      }
      inferred = Any;
    }

    this.#inferenceCache.set(indexPath, inferred);
    return inferred;
  }

  /**
   * Infers the type of `expr` in `context` at `indexPath`.
   */
  #inferType_(expr: Expr, context: TypeContext, indexPath: TreeIndexPath): Type {
    switch (expr.kind) {
      case "bool":
      case "number":
      case "string":
      case "symbol":
      case "list":
        return this.#inferTypeFromDatum(expr, context, indexPath);

      case "var":
      case "name-binding": {
        // For name-binding: this is *only* to update the inference cache.

        const varType = context[expr.id];
        if (!varType) throw { tag: "UnboundVariable", v: expr } satisfies UnboundVariable;

        // TODO: Old code was return this.#instantiate(varType, env);
        return varType;
      }

      case "define": {
        let newContext: TypeContext;
        let inferredType: Type;

        if (!isHole(expr.name) && expr.name.type) {
          newContext = bindInContext(context, expr.name);
          inferredType = expr.name.type;

          // Ensure this is a sound type annotation
          this.#checkType(expr.value, inferredType, newContext, extendIndexPath(indexPath, 1));
        } else {
          // Make the definition visible to itself in the context
          newContext = isHole(expr.name) ? context : bindInContext(context, expr.name);

          // Infer a better type for the definition
          inferredType = this.#inferType(expr.value, newContext, extendIndexPath(indexPath, 1));

          // Update the definition's type in the context
          newContext = isHole(expr.name)
            ? context
            : bindInContextWithType(context, expr.name, inferredType);
        }

        // Cache inferred type for the defined variable, even if it is not used,
        // so that the editor can display it
        this.#inferType(expr.name, newContext, extendIndexPath(indexPath, 0));

        return inferredType;
      }

      case "lambda": {
        let newContext = context;
        expr.params.forEach((param) => {
          if (!isHole(param)) {
            newContext = bindInContext(newContext, param);
          }
        });

        // Cache inferred types for all parameters, even if they are not used in the lambda body,
        // so that the editor can display them
        expr.params.forEach((param, index) => {
          this.#inferType(param, newContext, extendIndexPath(indexPath, index));
        });

        // Infer type of lambda body
        const bodyType = this.#inferType(
          expr.body,
          newContext,
          extendIndexPath(indexPath, expr.params.length)
        );

        return {
          tag: "Function",
          of: [
            ...expr.params.map((param) => (isHole(param) ? undefined : param.type) ?? Any),
            bodyType,
          ],
        };
      }

      case "call": {
        const calledType = this.#inferType(expr.called, context, extendIndexPath(indexPath, 0));

        if (hasTag(calledType, "Any")) {
          expr.args.forEach((arg, index) => {
            this.#inferType(arg, context, extendIndexPath(indexPath, index + 1));
          });
          return Any;
        } else if (hasTag(calledType, "Never")) {
          expr.args.forEach((arg, index) => {
            this.#inferType(arg, context, extendIndexPath(indexPath, index + 1));
          });
          return Never;
        } else if (hasTag(calledType, "Function*")) {
          // Variadic function

          const variadicParamTypes = functionParamTypes(calledType);
          const resultType = functionResultType(calledType);

          if (
            !(
              (calledType.minArgCount ?? 0) <= expr.args.length &&
              expr.args.length <= (calledType.maxArgCount ?? Infinity)
            )
          ) {
            this.errors.add(indexPath, {
              tag: "VariadicArityMismatch",
              call: expr,
              calledType,
              minArity: calledType.minArgCount,
              maxArity: calledType.maxArgCount,
              attemptedCallArity: expr.args.length,
            } satisfies VariadicArityMismatch);
            return resultType;
          }

          expr.args.forEach((arg, index) => {
            this.#checkType(
              arg,
              variadicParamTypes[index] ?? variadicParamTypes.at(-1)!,
              context,
              extendIndexPath(indexPath, index + 1)
            );
          });

          return resultType;
        } else if (hasTag(calledType, "Function")) {
          // Simple function

          const paramTypes = functionParamTypes(calledType);
          const resultType = functionResultType(calledType);

          if (expr.args.length !== paramTypes.length) {
            this.errors.add(indexPath, {
              tag: "ArityMismatch",
              call: expr,
              calledType,
              arity: paramTypes.length,
              attemptedCallArity: expr.args.length,
            } satisfies ArityMismatch);
            return resultType;
          }

          expr.args.forEach((arg, index) => {
            this.#checkType(
              arg,
              paramTypes[index]!,
              context,
              extendIndexPath(indexPath, index + 1)
            );
          });

          return resultType;
        } else {
          throw { tag: "NotCallable", call: expr, calledType } satisfies NotCallable;
        }
      }

      case "let": {
        let newContext = context;
        expr.bindings.forEach(([name, value], index) => {
          if (!isHole(name) && name.type) {
            newContext = bindInContext(newContext, name);

            // Ensure this is a sound type annotation
            this.#checkType(
              value,
              name.type,
              // Old context: This is plain `let`!
              context,
              extendIndexPath(indexPath, 2 * index + 1)
            );
          } else {
            // Infer a type for the definition
            const inferredType = this.#inferType(
              value,
              // Old context: This is plain `let`!
              context,
              extendIndexPath(indexPath, 2 * index + 1)
            );

            // Update the definition's type in the context
            newContext = isHole(name)
              ? context
              : bindInContextWithType(context, name, inferredType);
          }
        });

        // Cache inferred types for name bindings in the new context,
        // so that the editor can display them
        expr.bindings.forEach(([name], index) => {
          this.#inferType(name, newContext, extendIndexPath(indexPath, 2 * index));
        });

        return this.#inferType(
          expr.body,
          newContext,
          extendIndexPath(indexPath, 2 * expr.bindings.length)
        );
      }

      case "sequence": {
        let resultType: Type = Any;

        expr.exprs.forEach((sequencedExpr, index) => {
          resultType = this.#inferType(sequencedExpr, context, extendIndexPath(indexPath, index));
        });

        return resultType;
      }

      case "if":
        this.#inferType(expr.if, context, extendIndexPath(indexPath, 0));
        const thenType = this.#inferType(expr.then, context, extendIndexPath(indexPath, 1));
        const elseType = this.#inferType(expr.else, context, extendIndexPath(indexPath, 2));

        return typeJoin(thenType, elseType);
    }

    throw "TODO";
  }

  #inferTypeFromDatum(datum: Datum, context: TypeContext, indexPath: TreeIndexPath): Type {
    switch (datum.kind) {
      case "bool":
        return { tag: "Boolean" };
      case "number":
        return datum.value === Math.floor(datum.value) ? { tag: "Integer" } : { tag: "Number" };
      case "string":
        return { tag: "String" };
      case "symbol":
        if (datum.value === "·") return Any;
        return { tag: "Symbol" };
      case "list": {
        let elementType: Type = Never;

        datum.heads.forEach((head, index) => {
          elementType = typeJoin(
            elementType,
            this.#inferType(head, context, extendIndexPath(indexPath, index + 1))
          );
        });

        if (datum.tail) {
          elementType = typeJoin(
            elementType,
            this.#inferType(datum.tail, context, extendIndexPath(indexPath, 0))
          );
        }

        return { tag: "List", of: [elementType] };
      }
    }
  }

  /**
   * Checks that `expr` has `type` in `context`.
   */
  #checkType(expr: Expr, type: Type, context: TypeContext, indexPath: TreeIndexPath): void {
    if (!this.#checkType_(expr, type, context, indexPath)) {
      this.errors.add(indexPath, {
        tag: "InvalidAssignment",
        expr,
        type,
      } satisfies InvalidAssignment);
    }
  }

  #checkType_(expr: Expr, type: Type, context: TypeContext, indexPath: TreeIndexPath): boolean {
    const exprType = this.#inferType(expr, context, indexPath);

    if (hasTag(type, "Any")) return true;

    switch (expr.kind) {
      case "bool":
      case "number":
      case "string":
      case "symbol":
      case "list":
        return isSubtype(exprType, type);

      case "var":
        const varType = context[expr.id];
        if (!varType) throw { tag: "UnboundVariable", v: expr } satisfies UnboundVariable;
        return isSubtype(varType, type);

      case "lambda":
        return isSubtype(exprType, type);

      case "call":
        return isSubtype(exprType, type);
    }

    throw "TODO";
  }
}