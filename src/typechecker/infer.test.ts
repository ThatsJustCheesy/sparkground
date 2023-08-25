import { Lambda } from "./ast/ast"
import { TypeInferrer } from "./infer"
import { InferrableType, Type } from "./type"

describe("TypeInferrer", () => {
  let inferrer: TypeInferrer
  beforeEach(() => {
    inferrer = new TypeInferrer()
  })

  it("infers basic atomic types", () => {
    expect(inferrer.infer({ kind: "number", value: 42 })).toEqual<Type>({ tag: "Integer" })
    expect(inferrer.infer({ kind: "bool", value: true })).toEqual<Type>({ tag: "Boolean" })
    expect(inferrer.infer({ kind: "string", value: "hello" })).toEqual<Type>({ tag: "String" })
    expect(inferrer.infer({ kind: "null" })).toEqual<Type>({ tag: "Null" })
  })

  it("infers variable types", () => {
    expect(() => inferrer.infer({ kind: "var", id: "x" })).toThrow(/unbound variable/)
    expect(inferrer.infer({ kind: "var", id: "x" }, { x: { tag: "Integer" } })).toEqual<Type>({ tag: "Integer" })
  })

  it("infers sequence types", () => {
    expect(
      inferrer.infer({
        kind: "sequence",
        exprs: [
          { kind: "number", value: 0 },
          { kind: "bool", value: false },
        ],
      })
    ).toEqual<Type>({ tag: "Boolean" })
  })

  it("infers procedure types", () => {
    const const42: Lambda = { kind: "lambda", params: [], body: { kind: "number", value: 42 } }
    expect(inferrer.infer(const42)).toEqual<Type>({ tag: "Procedure", out: { tag: "Integer" } })
    expect(inferrer.infer({ kind: "sexpr", called: const42, args: [] })).toEqual<Type>({ tag: "Integer" })
  })

  it("infers unary function types", () => {
    const id: Lambda = { kind: "lambda", params: ["x"], body: { kind: "var", id: "x" } }
    expect(inferrer.infer(id)).toEqual<Type>({ tag: "Function", in: { var: "a" }, out: { var: "a" } })
    expect(inferrer.infer({ kind: "sexpr", called: id, args: [{ kind: "number", value: 1 }] })).toEqual<Type>({ tag: "Integer" })
  })

  it("infers binary function types", () => {
    const second: Lambda = {
      kind: "lambda",
      params: ["x", "y"],
      body: { kind: "var", id: "y" },
    }
    expect(inferrer.infer(second)).toEqual<Type>({
      tag: "Function",
      in: { var: "a" },
      out: { tag: "Function", in: { var: "b" }, out: { var: "b" } },
    })
    expect(
      inferrer.infer({
        kind: "sexpr",
        called: second,
        args: [
          { kind: "number", value: 0 },
          { kind: "string", value: "" },
        ],
      })
    ).toEqual<Type>({ tag: "String" })
  })
})