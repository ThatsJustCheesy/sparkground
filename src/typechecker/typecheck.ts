import { Datum } from "../datum/datum";
import { TreeIndexPath, extendIndexPath, hole, isHole, rootIndexPath } from "../editor/trees/tree";
import {
  Define,
  Expr,
  NameBinding,
  Struct,
  VarSlot,
  getIdentifier,
  getTypeAnnotation,
} from "../expr/expr";
import {
  ArityMismatch,
  DuplicateDefinition,
  TypecheckError,
  InvalidAssignment,
  InvalidAssignmentToType,
  NotCallable,
  UnboundVariable,
  VariadicArityMismatch,
} from "./errors";
import {
  Never,
  SimpleConcreteType,
  Type,
  TypeNameBinding,
  Untyped,
  functionParamTypes,
  functionResultType,
  hasTag,
  isForallType,
} from "./type";
import { InvisiblePageID, Tree, newTree, removeTree } from "../editor/trees/trees";
import { isSubtype, typeJoin } from "./subtyping";
import { Defines } from "../evaluator/defines";
import { InitialTypeContext } from "../editor/typecheck";
import {
  ConstraintSet,
  computeMinimalSubstitution,
  constraintSetsMeet,
} from "./constraints/constraint-set";
import { eliminateUp, generateConstraints } from "./constraints/constraint-gen";
import { typeSubstitute } from "./type-substitution";
import { ErrorsByIndexPath } from "../expr/errors";

export type TypeContext = Record<string, Type>;

function bindInContext(context: TypeContext, binding: NameBinding): TypeContext {
  return bindInContextWithType(context, binding, binding.type ?? Untyped);
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

export class Typechecker {
  baseContext: TypeContext;

  errors: ErrorsByIndexPath<TypecheckError> = new ErrorsByIndexPath();
  autoReset: boolean;

  #defines: Defines<Type> = new Defines();
  #inferenceCache = new InferenceCache();

  constructor({
    baseContext,
    autoReset,
  }: {
    baseContext?: TypeContext;
    autoReset?: boolean;
  } = {}) {
    this.baseContext = baseContext ?? InitialTypeContext;
    this.autoReset = autoReset ?? false;
  }

  /**
   * Wipes the typechecker state clean.
   * all gone
   *
   * This is equivalent to just making a new typechecker, but resetting the state in
   * `inferType()` and co. allows clients to just call them repeatedly on the same instance.
   */
  reset() {
    // Clear public error state.
    // It is a new day.
    this.errors.clear();

    this.#defines.clear();
    this.#inferenceCache.clear();
  }

  clearCache() {
    this.#defines.clearComputed();
    this.#inferenceCache.clear();
  }

  addDefines(trees: Tree[]) {
    for (const tree of trees) {
      try {
        const { root } = tree;
        switch (root.kind) {
          case "struct":
          case "define":
            this.addDefine(tree as Tree<typeof root>);
        }
      } catch (error) {
        // TODO: Remove this try/catch once eval() is changed to not throw any errors
        console.error(error);
      }
    }
  }

  addDefine(tree: Tree<Define | Struct>): void {
    const define = tree.root;

    if (this.#defines.has(getIdentifier(tree.root.name))) {
      this.errors.add(rootIndexPath(tree), {
        tag: "DuplicateDefinition",
        id: (define.name as NameBinding).id,
      } satisfies DuplicateDefinition);
    }

    this.#inferType(define, this.baseContext, rootIndexPath(tree));
  }

  inferType(tree: Tree, context?: TypeContext): Type;
  inferType(expr: Expr, context?: TypeContext): Type;
  inferType(tree: Tree | Expr, context: TypeContext = this.baseContext): Type {
    // If given an `Expr`, stuff it into its own tree before running inference,
    // as inference requires an index path into a tree (to deal with subexpressions).
    let isTempTree = false;
    if (!("root" in tree)) {
      isTempTree = true;
      tree = newTree(tree, { x: -1000, y: -1000 }, InvisiblePageID);
    }

    try {
      if (this.autoReset) this.reset();

      return this.#inferType(tree.root, context, rootIndexPath(tree));
    } finally {
      // If we stuffed the given `Expr` into a temporary tree, ensure we clean that up.
      // Like nothing ever happened. shhh
      if (isTempTree) removeTree(tree);
    }
  }

  inferSubexprType(indexPath: TreeIndexPath, context: TypeContext = this.baseContext): Type {
    if (this.autoReset) this.reset();

    // First, infer the type of the entire tree.
    this.#inferType(indexPath.tree.root, context, rootIndexPath(indexPath.tree));

    // Cache inferred types for all defines, even if they are not used,
    // so that the editor can display them.
    this.#defines.computeAll();

    // We already computed the type of the entire expression, which visits every subexpression.
    // Thus, the inference cache should know the type of the subexpression pointed to by indexPath.
    const inferredType = this.#inferenceCache.get(indexPath);
    if (!inferredType) {
      console.error("no type in inference cache for index path :(", indexPath);
      return Untyped;
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
        this.errors.add(indexPath, error as TypecheckError);
      } else {
        console.error(error);
      }
      inferred = Untyped;
    }

    this.#inferenceCache.set(indexPath, inferred);
    return inferred;
  }

  /**
   * Infers the type of `expr` in `context` at `indexPath`.
   */
  #inferType_(expr: Expr, context: TypeContext, indexPath: TreeIndexPath): Type {
    switch (expr.kind) {
      case "Boolean":
      case "Number":
      case "String":
      case "Symbol":
      case "List":
        return this.#inferTypeFromDatum(expr, context, indexPath);

      case "var":
      case "name-binding": {
        // For name-binding: this is *only* to update the inference cache.

        const varType = this.#get(expr.id, context);
        if (!varType) throw { tag: "UnboundVariable", v: expr } satisfies UnboundVariable;
        if (varType === "circular") return Untyped;

        // TODO: Old code was return this.#instantiate(varType, env);
        return varType;
      }

      case "struct": {
        // Cache annotated type for name binding node, so that the editor can display it.
        const cacheBindingType = (name: VarSlot, indexPath: TreeIndexPath, type: Type) => {
          this.#inferType(
            name,
            isHole(name) ? context : bindInContextWithType(context, name, type),
            indexPath
          );
        };

        this.#defines.addAll(
          expr.fields.map((fieldName, fieldIndex) => [
            getIdentifier(fieldName),
            (): Type => {
              if (isHole(expr.name)) return Untyped;

              // Synthesize field accessor type
              const structName = getIdentifier(expr.name);
              const fieldType = getTypeAnnotation(fieldName) ?? Untyped;
              const accessorType: SimpleConcreteType<"Function"> = {
                tag: "Function",
                of: [{ tag: structName }, fieldType],
              };

              cacheBindingType(fieldName, extendIndexPath(indexPath, fieldIndex + 1), accessorType);
              return accessorType;
            },
          ])
        );

        this.#defines.add(getIdentifier(expr.name), () => {
          if (isHole(expr.name)) return Untyped;

          // Synthesize constructor type
          const structName = getIdentifier(expr.name);
          const fieldTypes = expr.fields.map(
            (fieldName) => getTypeAnnotation(fieldName) ?? Untyped
          );
          const constructorType: SimpleConcreteType<"Function"> = {
            tag: "Function",
            of: [...fieldTypes, { tag: structName }],
          };

          cacheBindingType(expr.name, extendIndexPath(indexPath, 0), constructorType);
          return constructorType;
        });

        return { tag: "Empty" };
      }

      case "define": {
        // Cache annotated or inferred type for name binding node, so that the editor can display it.
        const cacheBindingType = (name: VarSlot, indexPath: TreeIndexPath, type: Type) => {
          this.#inferType(
            name,
            isHole(name) ? context : bindInContextWithType(context, name, type),
            indexPath
          );
        };

        const typeAnnotation = getTypeAnnotation(expr.name);
        if (typeAnnotation) {
          this.#defines.add(getIdentifier(expr.name), () => {
            // Ensure this is a sound type annotation
            this.#checkType(expr.value, typeAnnotation, context, extendIndexPath(indexPath, 1));

            cacheBindingType(expr.name, extendIndexPath(indexPath, 0), typeAnnotation);
            return typeAnnotation;
          });
        } else {
          // Make the definition visible to itself
          this.#defines.add(getIdentifier(expr.name), () => {
            // Infer a type for the definition
            const type = this.#inferType(expr.value, context, extendIndexPath(indexPath, 1));

            cacheBindingType(expr.name, extendIndexPath(indexPath, 0), type);
            return type;
          });
        }

        return { tag: "Empty" };
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

        // Cache type for phantom "+" button (name hole) at the end of the parameter list
        this.#inferType(hole, newContext, extendIndexPath(indexPath, expr.params.length));

        // Infer type of lambda body
        const bodyType = this.#inferType(
          expr.body,
          newContext,
          extendIndexPath(indexPath, expr.params.length + 1)
        );

        return {
          tag: "Function",
          of: [
            ...expr.params.map((param) => (isHole(param) ? undefined : param.type) ?? Untyped),
            bodyType,
          ],
        };
      }

      case "call": {
        let calledType = this.#inferType(expr.called, context, extendIndexPath(indexPath, 0));

        let constrainVarNames: string[] = [];
        while (isForallType(calledType)) {
          constrainVarNames.push(
            ...(
              calledType.forall.filter(
                ({ kind }) => kind === "type-name-binding"
              ) as TypeNameBinding[]
            ).map(({ id }) => id)
          );
          calledType = calledType.body;
        }

        if (hasTag(calledType, Untyped.tag)) {
          expr.args.forEach((arg, index) => {
            this.#inferType(arg, context, extendIndexPath(indexPath, index + 1));
          });
          return Untyped;
        } else if (hasTag(calledType, Never.tag)) {
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

          const argTypes = expr.args.map((arg, index) =>
            this.#inferType(arg, context, extendIndexPath(indexPath, index + 1))
          );
          const paramTypes = [
            ...variadicParamTypes,
            ...Array(Math.max(0, argTypes.length - variadicParamTypes.length)).fill(
              variadicParamTypes.at(-1)!
            ),
          ];

          const instantiatedResultType = this.#inferResultType(
            constrainVarNames,
            expr.args,
            argTypes,
            paramTypes,
            resultType
          );
          if (instantiatedResultType === undefined) {
            throw {
              tag: "InvalidAssignment",
              expr,
            } satisfies InvalidAssignment;
          }

          return instantiatedResultType;
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

          const argTypes = expr.args.map((arg, index) =>
            this.#inferType(arg, context, extendIndexPath(indexPath, index + 1))
          );

          const instantiatedResultType = this.#inferResultType(
            constrainVarNames,
            expr.args,
            argTypes,
            paramTypes,
            resultType
          );
          if (instantiatedResultType === undefined) {
            throw {
              tag: "InvalidAssignment",
              expr,
            } satisfies InvalidAssignment;
          }

          return instantiatedResultType;
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
            if (!isHole(name)) {
              newContext = bindInContextWithType(newContext, name, inferredType);
            }
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

      case "letrec": {
        let newContext = context;
        expr.bindings.forEach(([name]) => {
          if (!isHole(name)) {
            newContext = bindInContext(newContext, name);
          }
        });

        expr.bindings.forEach(([name, value], index) => {
          if (!isHole(name) && name.type) {
            // Ensure this is a sound type annotation
            this.#checkType(
              value,
              name.type,
              newContext,
              extendIndexPath(indexPath, 2 * index + 1)
            );
          } else {
            // Infer a type for the definition
            const inferredType = this.#inferType(
              value,
              newContext,
              extendIndexPath(indexPath, 2 * index + 1)
            );

            // Update the definition's type in the context
            if (!isHole(name)) {
              newContext = bindInContextWithType(newContext, name, inferredType);
            }
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
        let resultType: Type = Untyped;

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
      case "Boolean":
        return { tag: "Boolean" };
      case "Number":
        return datum.value === Math.floor(datum.value) ? { tag: "Integer" } : { tag: "Number" };
      case "String":
        return { tag: "String" };
      case "Symbol":
        if (datum.value === "·") return Untyped;
        return { tag: "Symbol" };
      case "List": {
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

  #inferResultType(
    constrainVarNames: string[],
    args: Expr[],
    argTypes: Type[],
    paramTypes: Type[],
    resultType: Type
  ): Type | undefined {
    const constraintSet = constraintSetsMeet(
      this.#generateConstraints(constrainVarNames, args, argTypes, paramTypes)
    );
    if (!constraintSet) return undefined;

    const substitution = computeMinimalSubstitution(constraintSet, resultType);
    if (!substitution) return undefined;

    const substitutedResultType = typeSubstitute(resultType, substitution);
    return eliminateUp(constrainVarNames, substitutedResultType);
  }

  #generateConstraints(
    constrainVarNames: string[],
    args: Expr[],
    argTypes: Type[],
    paramTypes: Type[]
  ) {
    const constraintSets: (ConstraintSet | undefined)[] = argTypes.map((argType, index) =>
      generateConstraints([], constrainVarNames, argType, paramTypes[index]!)
    );

    const invalidIndex = constraintSets.findIndex((set) => set === undefined);
    if (invalidIndex !== -1) {
      throw {
        tag: "InvalidAssignmentToType",
        expr: args[invalidIndex]!,
        type: paramTypes[invalidIndex]!,
      } satisfies InvalidAssignmentToType;
    }
    return constraintSets as ConstraintSet[];
  }

  /**
   * Checks that `expr` has `type` in `context`.
   */
  #checkType(expr: Expr, type: Type, context: TypeContext, indexPath: TreeIndexPath): void {
    if (!this.#checkType_(expr, type, context, indexPath)) {
      this.errors.add(indexPath, {
        tag: "InvalidAssignmentToType",
        expr,
        type,
      } satisfies InvalidAssignmentToType);
    }
  }

  #checkType_(expr: Expr, type: Type, context: TypeContext, indexPath: TreeIndexPath): boolean {
    const exprType = this.#inferType(expr, context, indexPath);

    if (hasTag(type, Untyped.tag)) return true;

    // TODO: This switch will become useful, I swear
    switch (expr.kind) {
      case "Boolean":
      case "Number":
      case "String":
      case "Symbol":
      case "List":
        return isSubtype(exprType, type);

      case "var":
        return isSubtype(exprType, type);

      case "lambda":
        return isSubtype(exprType, type);

      case "call":
        return isSubtype(exprType, type);
    }

    throw "TODO";
  }

  #get(name: string, context: TypeContext): Type | undefined | "circular" {
    return context[name] ?? this.#defines.get(name);
  }
}
