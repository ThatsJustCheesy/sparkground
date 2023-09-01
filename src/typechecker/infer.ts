import { cloneDeep, isEqual, mapValues } from "lodash";
import {
  ConcreteInferrableType,
  InferrableType,
  Type,
  Unknown,
  assertNoTypeVar,
  hasNoUnknown,
  isTypeVar,
  isUnknown,
  typeParams,
  typeStructureMap,
} from "./type";
import { Expr, getIdentifier } from "./ast/ast";
import { serializeType } from "./serialize";
import { TreeIndexPath, extendIndexPath, rootIndexPath } from "../editor/ast/ast";
import { Tree, newTree, removeTree } from "../editor/ast/trees";
import { serializeExpr } from "../editor/ast/serialize";
import { DisjointMaps } from "./disjoint-maps";
import {
  InferenceError,
  UnboundVariable,
  ArityMismatch,
  OccursCheckFailure,
  TypeMismatch,
} from "./errors";

// https://www.cs.utoronto.ca/~trebla/CSCC24-2023-Summer/11-type-inference.html

export type TypeEnv<T = InferrableType> = Record<string, T>;

class InferenceCache {
  inferred = new Map<string, InferrableType>();

  get({ tree, path }: TreeIndexPath): InferrableType | undefined {
    return this.inferred.get(tree.id + "#" + path.join("."));
  }

  set({ tree, path }: TreeIndexPath, inferredType: InferrableType) {
    this.inferred.set(tree.id + "#" + path.join("."), inferredType);
  }

  clear() {
    this.inferred.clear();
  }
}

export class TypeInferrer {
  error?: InferenceError;

  cache = new InferenceCache();

  #reset() {
    this.error = undefined;
    this.cache.clear();
    this.#unifications.reset();
    this.#lastUnknown = 0;
  }

  infer(tree: Tree, env?: TypeEnv): Type;
  infer(expr: Expr, env?: TypeEnv): Type;
  infer(tree: Tree | Expr, env: TypeEnv = {}): Type {
    let isTempTree = false;
    if (!("root" in tree)) {
      isTempTree = true;
      tree = newTree(tree, { x: -1000, y: -1000 });
    }

    this.#reset();

    // console.log("infer:", JSON.stringify(tree.root));
    const inferredType = this.#generalize(this.#infer(tree.root, env, rootIndexPath(tree)), env);
    // console.log("inferred:", serializeType(inferredType));

    if (isTempTree) removeTree(tree);

    if (!hasNoUnknown(inferredType))
      throw `type could not be completely inferred: ${serializeType(inferredType)}`;

    return inferredType;
  }

  inferSubexpr(indexPath: TreeIndexPath, env: TypeEnv = {}): Type {
    this.#reset();

    // console.log("infer subexpr:", indexPath.path.join("."));
    const inferredRootType = this.#infer(indexPath.tree.root, env, rootIndexPath(indexPath.tree));
    const unificationsWithTypeVars = this.#unifications.clone();
    const rootInferredType = this.#generalize(inferredRootType, env, unificationsWithTypeVars);
    // console.log("inferred:", serializeType(rootInferredType));
    unificationsWithTypeVars.dump();

    let inferredType = this.cache.get(indexPath);
    if (!inferredType) {
      console.error("index path not valid for expr?", indexPath);
      throw "programmer error! index path not valid for expr?";
    }
    inferredType = this.#generalize(inferredType, env, unificationsWithTypeVars);

    if (!hasNoUnknown(inferredType))
      throw `type could not be completely inferred: ${serializeType(inferredType)}`;

    return inferredType;
  }

  #infer(expr: Expr, env: TypeEnv, indexPath: TreeIndexPath): InferrableType {
    const alreadyInferred = this.cache.get(indexPath);
    if (alreadyInferred) return alreadyInferred;

    this.error = undefined;

    try {
      const inferred = this.#infer_(expr, env, indexPath);
      this.cache.set(indexPath, inferred);
      return inferred;
    } catch (error) {
      if (typeof error === "object" && "tag" in error) {
        this.error = error as InferenceError;
      }
      throw error;
    }
  }

  #infer_(expr: Expr, env: TypeEnv, indexPath: TreeIndexPath): InferrableType {
    switch (expr.kind) {
      case "hole":
        return this.#newUnknown("_");

      case "number":
        return expr.value === Math.floor(expr.value) ? { tag: "Integer" } : { tag: "Number" };
      case "bool":
        return { tag: "Boolean" };
      case "string":
        return { tag: "String" };
      case "null":
        return { tag: "Null" };

      case "var":
        const varType = env[expr.id];
        if (!varType) throw { tag: "UnboundVariable", v: expr } satisfies UnboundVariable;
        return this.#instantiate(varType, env);

      case "call":
        const calledType = this.#infer(expr.called, env, extendIndexPath(indexPath, 0));
        if (isUnknown(calledType)) {
          console.error(env);
          throw `call to expression with type that could not be inferred: ${serializeType(
            calledType
          )}, ${serializeExpr(expr)}`;
        }
        assertNoTypeVar(calledType);

        if (calledType.tag === "Procedure") {
          if (expr.args.length) {
            throw {
              tag: "ArityMismatch",
              call: expr,
              calledType: calledType,
              arity: 0,
              attemptedCallArity: expr.args.length,
            } satisfies ArityMismatch;
          }
          return calledType.out;
        }

        if (!expr.args.length) {
          throw {
            tag: "ArityMismatch",
            call: expr,
            calledType: calledType,
            arity: 1,
            attemptedCallArity: 0,
          } satisfies ArityMismatch;
        }

        let resultType: InferrableType = calledType;

        let args = [...expr.args];
        let i = 0;
        while (args.length) {
          const arg = args.pop()!;

          const argType = this.#infer(arg, env, extendIndexPath(indexPath, args.length + 1));
          const newResultType = this.#newUnknown(
            expr.called.kind === "var" ? expr.called.id : "Anonymous"
          );

          this.#unify(
            resultType,
            {
              tag: "Function",
              in: argType,
              out: newResultType,
            },
            expr.called,
            arg
          );

          resultType = this.#sub(newResultType);
        }

        return resultType;

      case "define": {
        const defType = this.#newUnknown(getIdentifier(expr.name));
        const newEnv = {
          ...env,
          [getIdentifier(expr.name)]: defType,
        };

        const inferredType = this.#infer(expr.value, newEnv, extendIndexPath(indexPath, 1));

        this.#unify(defType, inferredType, expr.name, expr.value);

        // Cache inferred type for the defined variable, even if it is not used,
        // so that the editor can display it
        this.#infer(expr.name, newEnv, extendIndexPath(indexPath, 0));

        return inferredType;
      }

      case "let":
        // TODO: This has plain `let` behaviour; we probably want `let*` or `letrec`
        const newEnv = {
          ...env,
          ...Object.fromEntries(
            expr.bindings.map(([name, value], index) => [
              getIdentifier(name),
              this.#generalize(
                this.#infer(value, env, extendIndexPath(indexPath, 2 * index + 1)),
                env
              ),
            ])
          ),
        };

        // Cache inferred types for the defined variables, even if they are not used,
        // so that they editor can display them
        expr.bindings.forEach(([name], index) => {
          this.#infer(name, newEnv, extendIndexPath(indexPath, 2 * index));
        });

        return this.#infer(expr.body, newEnv, extendIndexPath(indexPath, 2 * expr.bindings.length));

      case "lambda": {
        const paramTypes = Object.fromEntries(
          expr.params.map((param) => [getIdentifier(param), this.#newUnknown(getIdentifier(param))])
        );
        const newEnv = {
          ...env,
          ...paramTypes,
        };

        // Cache inferred types for all parameters, even if they are not used in the lambda body,
        // so that the editor can display them
        expr.params.forEach((param, index) => {
          this.#infer(param, newEnv, extendIndexPath(indexPath, index));
        });

        // Infer type of lambda body
        const bodyType = this.#infer(
          expr.body,
          newEnv,
          extendIndexPath(indexPath, expr.params.length)
        );

        return !expr.params.length
          ? { tag: "Procedure", out: bodyType }
          : Object.values(paramTypes).reduceRight(
              (resultType, paramType): InferrableType => ({
                tag: "Function",
                in: paramType,
                out: resultType,
              }),
              bodyType
            );
      }

      case "sequence": {
        let resultType: InferrableType = this.#newUnknown("EmptySequence");

        expr.exprs.forEach((sequencedExpr, index) => {
          resultType = this.#infer(sequencedExpr, env, extendIndexPath(indexPath, index));
        });

        return resultType;
      }

      case "if":
        this.#infer(expr.if, env, extendIndexPath(indexPath, 0));
        const thenType = this.#infer(expr.then, env, extendIndexPath(indexPath, 1));
        const elseType = this.#infer(expr.else, env, extendIndexPath(indexPath, 2));

        this.#unify(thenType, elseType, expr.then, expr.else);
        return this.#sub(thenType);

      case "cond":
        let overallType: InferrableType = this.#newUnknown("Cond");

        expr.cases.forEach(([condition, value], index) => {
          this.#infer(condition, env, extendIndexPath(indexPath, 2 * index));
          const valueType = this.#infer(value, env, extendIndexPath(indexPath, 2 * index + 1));

          this.#unify(overallType, valueType, expr, value);
          overallType = this.#sub(valueType);
        });

        return overallType;

      case "hole":
        return this.#newUnknown("_");
    }
  }

  #instantiate(
    t: InferrableType,
    env: TypeEnv,
    typeVarEnv: TypeEnv<Unknown> = {}
  ): ConcreteInferrableType {
    if (isUnknown(t)) return t;
    if (isTypeVar(t)) {
      const unknown = typeVarEnv[t.var] ?? this.#newUnknown(t.var);
      typeVarEnv[t.var] = unknown;

      // console.log("instantiate", t.var, "as", unknown.unknown);

      return unknown;
    }
    return typeStructureMap<InferrableType, ConcreteInferrableType>(t, (type) =>
      this.#instantiate(type, env, typeVarEnv)
    );
  }

  #generalize(
    t: InferrableType,
    env: TypeEnv,
    unifications: TypeUnifications = this.#unifications.clone()
  ): InferrableType {
    t = this.#sub(t);
    // console.log("generalize:", JSON.stringify(t));

    const subbedEnv = mapValues(env, (type) => this.#sub(type));
    return this.#generalizeRecur(t, subbedEnv, unifications);
  }

  #generalizeRecur(
    t: InferrableType,
    env: TypeEnv,
    unifications: TypeUnifications
  ): InferrableType {
    let typeVarName: string;
    do {
      typeVarName = unifications.newTypeVarName();
    } while (Object.values(env).find((type) => isTypeVar(type) && type.var === typeVarName));
    unifications.nextTypeVarName = typeVarName;

    if (isTypeVar(t)) return t;
    if (isUnknown(t)) {
      t = unifications.resolve(t);
      if (!isUnknown(t)) return t;

      unifications.unify(t, { var: unifications.newTypeVarName() });
      return unifications.resolve(t);
    }
    return typeStructureMap<InferrableType, InferrableType>(t, (type) =>
      this.#generalizeRecur(type, env, unifications)
    );
  }

  #lastUnknown = 0;
  #newUnknown(prefix?: string): Unknown {
    return { unknown: `${prefix ?? ""}#u${this.#lastUnknown++}` };
  }

  #unifications = new TypeUnifications();

  #unify(t1: InferrableType, t2: InferrableType, e1: Expr, e2: Expr): void {
    t1 = this.#sub(t1);
    t2 = this.#sub(t2);

    if (isEqual(t1, t2)) return;

    // If either t1 or t2 is an unknown, ensure one of the unknowns is t1
    if (isUnknown(t2)) [t1, t2] = [t2, t1];

    if (isUnknown(t1)) {
      if (this.#occurs(t1, t2)) {
        throw { tag: "OccursCheckFailure", e1, e2, t1, t2 } satisfies OccursCheckFailure;
      }

      this.#unifications.unify(t1, t2);

      // console.log(
      //   "unifications:",
      //   this.#unifications.dump(),
      //   ", unify t1:",
      //   JSON.stringify(t1),
      //   "t2:",
      //   JSON.stringify(t2)
      // );
    } else {
      // If the original t2 was unknown, then it became t1, and the other branch will have run.
      // (Otherwise, the original t2 was not unknown.)
      if (isUnknown(t2)) throw "programmer error! should not happen!";

      assertNoTypeVar(t1);
      assertNoTypeVar(t2);

      // TODO: This is a hack. Do real, general subtype checking.
      if (t1.tag === "Any" || t2.tag === "Any") return;
      if (t1.tag === "Integer" && t2.tag === "Number") t2.tag = "Integer" as any;
      if (t2.tag === "Integer" && t1.tag === "Number") t1.tag = "Integer" as any;

      if (t1.tag !== t2.tag) throw { tag: "TypeMismatch", e1, e2, t1, t2 } satisfies TypeMismatch;

      const t1Params = typeParams(t1);
      const t2Params = typeParams(t2);
      for (const key in t1Params) {
        this.#unify(
          t1Params[key as keyof typeof t1Params],
          t2Params[key as keyof typeof t2Params],
          e1,
          e2
        );
      }
    }
  }

  #occurs(u: Unknown, typeExpr: InferrableType): boolean {
    return isUnknown(typeExpr)
      ? u.unknown === typeExpr.unknown
      : Object.values(typeParams(typeExpr)).some((typeParamExpr) => this.#occurs(u, typeParamExpr));
  }

  #sub(t: InferrableType, unifications = this.#unifications): InferrableType {
    if (isUnknown(t)) t = unifications.resolve(t);

    let oldT: InferrableType;
    do {
      oldT = cloneDeep(t);
      t = this.#subOnce(t, unifications);
    } while (!isEqual(t, oldT));

    return t;
  }

  #subOnce(t: InferrableType, unifications: TypeUnifications): InferrableType {
    if (isUnknown(t)) return unifications.resolve(t);

    return typeStructureMap(t, (type) => this.#sub(type, unifications) as any);
  }
}

class TypeUnifications {
  #maps = new DisjointMaps<string, TypeUnification>((v1, v2) => ({
    resolved: !isUnknown(v1.resolved) ? v1.resolved : v2.resolved,
    repr: v1.repr,
  }));

  constructor() {
    this.reset();
  }

  reset(): void {
    this.#maps.reset();
  }

  clone(): TypeUnifications {
    const clone = new TypeUnifications();
    clone.#maps = this.#maps.clone();
    return clone;
  }

  #for(u: Unknown): TypeUnification {
    const { unknown } = u;

    const rep = this.#maps.representative(unknown);
    if (rep) return rep;

    this.#maps.addSingleton(unknown, { resolved: u, repr: unknown });
    return this.#maps.representative(unknown)!;
  }

  unify(u: Unknown, t: InferrableType): void {
    const unification = this.#for(u);
    if (isUnknown(t)) {
      this.#maps.union(u.unknown, t.unknown);
    } else {
      unification.resolved = t;
    }
  }

  resolve(t: InferrableType): InferrableType {
    return isUnknown(t) ? this.#for(t).resolved ?? t : t;
  }

  dump(): void {
    this.#maps.dump();
  }

  // TODO: Doesn't exactly belong here, but this is the simplest place for now
  nextTypeVarName = "a";
  newTypeVarName() {
    const next = this.nextTypeVarName;
    this.nextTypeVarName = String.fromCharCode(next.charCodeAt(0) + 1);
    return next;
  }
}

type TypeUnification = {
  /**
   * Resolved type for an unknown-set.
   * This itself is an `Unknown` only if no better resolution is possible (yet).
   */
  resolved: InferrableType;

  // For debugging only
  repr: string;
};
