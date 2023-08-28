import { cloneDeep, isEmpty, isEqual, mapValues } from "lodash";
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

// https://www.cs.utoronto.ca/~trebla/CSCC24-2023-Summer/11-type-inference.html

export type TypeEnv<T = InferrableType> = Record<string, T>;

export class TypeInferrer {
  infer(expr: Expr, env: TypeEnv = {}): Type {
    const inferredType = this.#generalize(this.#infer(expr, env), env);
    console.log("inferred:", inferredType);
    if (!hasNoUnknown(inferredType))
      throw `type could not be completely inferred: ${JSON.stringify(inferredType)}`;
    return inferredType;
  }

  #infer(expr: Expr, env: TypeEnv): InferrableType {
    switch (expr.kind) {
      case "hole":
        return this.#newUnknown();

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
        if (!varType) throw "unbound variable";
        return this.#instantiate(varType, env);

      case "sexpr":
        const calledType = this.#infer(expr.called, env);
        if (isUnknown(calledType)) throw "call to expression with type that could not be inferred";
        assertNoTypeVar(calledType);

        if (calledType.tag === "Procedure") {
          if (expr.args.length) throw "procedure does not accept any arguments";
          return calledType.out;
        }

        if (calledType.tag !== "Function") throw "call to expression with non-function type";

        let resultType: InferrableType = calledType;

        let args = [...expr.args];
        while (args.length) {
          const arg = args.shift()!;

          const argType = this.#infer(arg, env);
          const newResultType = this.#newUnknown();

          this.#unify(resultType, {
            tag: "Function",
            in: argType,
            out: newResultType,
          });

          resultType = this.#sub(newResultType);
        }

        return resultType;

      case "define":
        return this.#infer(expr.value, {
          ...env,
          [getIdentifier(expr.name)]: this.#infer(expr.value, {
            ...env,
            [getIdentifier(expr.name)]: this.#newUnknown(),
          }),
        });

      case "let":
        // TODO: This has plain `let` behaviour; we probably want `let*` or `letrec`
        return this.#infer(expr.body, {
          ...env,
          ...Object.fromEntries(
            expr.bindings.map(([name, value]) => [
              getIdentifier(name),
              this.#generalize(this.#infer(value, env), env),
            ])
          ),
        });

      case "lambda":
        const paramTypes = Object.fromEntries(
          expr.params.map((param) => [getIdentifier(param), this.#newUnknown()])
        );
        const bodyType = this.#infer(expr.body, {
          ...env,
          ...paramTypes,
        });

        if (isEmpty(paramTypes)) return { tag: "Procedure", out: bodyType };

        return Object.values(paramTypes).reduceRight(
          (resultType, paramType): InferrableType => ({
            tag: "Function",
            in: paramType,
            out: resultType,
          }),
          bodyType
        );

      case "sequence": {
        let resultType: InferrableType = this.#newUnknown();

        for (const sequencedExpr of expr.exprs) {
          resultType = this.#infer(sequencedExpr, env);
        }

        return resultType;
      }

      case "if":
        const thenType = this.#infer(expr.then, env);
        const elseType = this.#infer(expr.else, env);

        this.#unify(thenType, elseType);
        return this.#sub(thenType);

      case "cond":
        let overallType: InferrableType = this.#newUnknown();

        for (const [, value] of expr.cases) {
          const valueType = this.#infer(value, env);

          this.#unify(overallType, valueType);
          overallType = this.#sub(valueType);
        }

        return overallType;
    }
  }

  #instantiate(
    t: InferrableType,
    env: TypeEnv,
    typeVarEnv: TypeEnv<Unknown> = {}
  ): ConcreteInferrableType {
    if (isEmpty(typeVarEnv)) console.log("instantiate:", JSON.stringify(t));
    if (isUnknown(t)) return t;
    if (isTypeVar(t)) {
      const unknown = typeVarEnv[t.var] ?? this.#newUnknown();
      typeVarEnv[t.var] = unknown;
      return unknown;
    }
    return typeStructureMap<InferrableType, ConcreteInferrableType>(t, (type) =>
      this.#instantiate(type, env, typeVarEnv)
    );
  }

  #generalize(t: InferrableType, env: TypeEnv): InferrableType {
    console.log("generalize:", JSON.stringify(t));
    const subbedEnv = mapValues(env, (type) => this.#sub(type));
    return this.#generalizeRecur(t, subbedEnv);
  }

  #generalizeRecur(t: InferrableType, env: TypeEnv, lastTypeVarName = ["a"]): InferrableType {
    if (isTypeVar(t)) return t;
    if (isUnknown(t)) {
      console.log(t.unknown, JSON.stringify(env));
      if (t.unknown in env) return env[t.unknown];

      const typeVarName = lastTypeVarName[0];
      lastTypeVarName[0] = this.#incrementLetter(lastTypeVarName[0]);
      env[t.unknown] = { var: typeVarName };

      return env[t.unknown];
    }
    return typeStructureMap<InferrableType, InferrableType>(t, (type) =>
      this.#generalizeRecur(type, env, lastTypeVarName)
    );
  }

  #incrementLetter(letter: string) {
    return String.fromCharCode(letter.charCodeAt(0) + 1);
  }

  #lastUnknown = 0;
  #newUnknown(): Unknown {
    return { unknown: `u${this.#lastUnknown++}` };
  }

  #unifications: Record<string, InferrableType> = {};

  #unify(t1: InferrableType, t2: InferrableType): void {
    t1 = this.#sub(t1);
    t2 = this.#sub(t2);

    if (isEqual(t1, t2)) return;

    // If either t1 or t2 is an unknown, ensure one of the unknowns is t1
    if (isUnknown(t2)) [t1, t2] = [t2, t1];

    if (isUnknown(t1)) {
      if (this.#occurs(t1, t2)) throw "occurs check failed";

      // Unify t1 and t2
      this.#unifications[t1.unknown] = t2;

      // Update existing t1 references to point to t2 instead
      for (const key in this.#unifications) {
        const sub = this.#unifications[key];
        if (isUnknown(sub) && sub.unknown === t1.unknown) {
          this.#unifications[key] = t2;
        }
      }

      // Normalize the table
      // TODO: For efficiency, should really use a better data structure
      if (isUnknown(t2)) {
        for (const key in this.#unifications) {
          const sub = this.#unifications[key];
          if (isUnknown(sub) && sub.unknown === t2.unknown) {
            this.#unifications[key] = this.#unifications[t2.unknown];
          }
        }
      }

      console.log(
        "unifications:",
        JSON.stringify(this.#unifications),
        "t1:",
        JSON.stringify(t1),
        "t2:",
        JSON.stringify(t2)
      );
    } else {
      // If the original t2 was unknown, then it became t1, and the other branch will have run.
      // (Otherwise, the original t2 was not unknown.)
      if (isUnknown(t2)) throw "programmer error! should not happen!";

      assertNoTypeVar(t1);
      assertNoTypeVar(t2);

      if (t1.tag !== t2.tag) throw "type mismatch";

      const t1Params = typeParams(t1);
      const t2Params = typeParams(t2);
      for (const key in t1Params) {
        this.#unify(t1Params[key as keyof typeof t1Params], t2Params[key as keyof typeof t2Params]);
      }
    }
  }

  #occurs(u: Unknown, typeExpr: InferrableType): boolean {
    return isUnknown(typeExpr)
      ? u.unknown === typeExpr.unknown
      : Object.values(typeParams(typeExpr)).some((typeParamExpr) => this.#occurs(u, typeParamExpr));
  }

  #sub(t: InferrableType): InferrableType {
    if (isUnknown(t)) return this.#unifications[t.unknown] ?? t;

    let oldT: InferrableType;
    do {
      oldT = cloneDeep(t);
      t = this.#subOnce(t);
    } while (!isEqual(t, oldT));

    return t;
  }

  #subOnce(t: InferrableType): InferrableType {
    if (isUnknown(t)) return this.#unifications[t.unknown] ?? t;

    return typeStructureMap(t, (type) => this.#sub(type) as any);
  }
}
