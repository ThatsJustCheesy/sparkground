import { Lambda } from "../expr/expr"
import { TypeInferrer } from "./infer"
import { BuiltinType, Type } from "./type"

describe("TypeInferrer", () => {
  let inferrer: TypeInferrer
  beforeEach(() => {
    inferrer = new TypeInferrer()
  })

  it("infers basic atomic types", () => {
    expect(inferrer.infer({ kind: "number", value: 42 })).toEqual<BuiltinType>({ tag: "Integer" })
    expect(inferrer.infer({ kind: "bool", value: true })).toEqual<BuiltinType>({ tag: "Boolean" })
    expect(inferrer.infer({ kind: "string", value: "hello" })).toEqual<BuiltinType>({ tag: "String" })
  })

  // it("infers variable types", () => {
  //   expect(() => inferrer.infer({ kind: "var", id: "x" })).toThrow()
  //   expect(inferrer.error?.tag).toEqual("UnboundVariable")
  //   expect(inferrer.infer({ kind: "var", id: "x" }, { x: { tag: "Integer" } })).toEqual<BuiltinType>({ tag: "Integer" })
  // })

  // it("infers sequence types", () => {
  //   expect(
  //     inferrer.infer({
  //       kind: "sequence",
  //       exprs: [
  //         { kind: "number", value: 0 },
  //         { kind: "bool", value: false },
  //       ],
  //     })
  //   ).toEqual<BuiltinType>({ tag: "Boolean" })
  // })

  // it("infers procedure types", () => {
  //   const const42: Lambda = { kind: "lambda", params: [], body: { kind: "number", value: 42 } }
  //   expect(inferrer.infer(const42)).toEqual<BuiltinType>({ tag: "Function", of: [{ tag: "Integer" }] })
  //   expect(inferrer.infer({ kind: "call", called: const42, args: [] })).toEqual<BuiltinType>({ tag: "Integer" })
  // })

  // it("infers unary function types", () => {
  //   const id: Lambda = { kind: "lambda", params: [{ kind: "name-binding", id: "x" }], body: { kind: "var", id: "x" } }
  //   expect(inferrer.infer(id)).toEqual<BuiltinType>({ tag: "Function", of: [{ var: "a" }, { var: "a" }] })
  //   expect(inferrer.infer({ kind: "call", called: id, args: [{ kind: "number", value: 1 }] })).toEqual<BuiltinType>({ tag: "Integer" })
  // })

  // it("infers binary function types", () => {
  //   const second: Lambda = {
  //     kind: "lambda",
  //     params: [
  //       { kind: "name-binding", id: "x" },
  //       { kind: "name-binding", id: "y" },
  //     ],
  //     body: { kind: "var", id: "y" },
  //   }
  //   expect(inferrer.infer(second)).toEqual<BuiltinType>({
  //     tag: "Function",
  //     of: [{ var: "a" }, { tag: "Function", of: [{ var: "b" }, { var: "b" }] }],
  //   })
  //   expect(
  //     inferrer.infer({
  //       kind: "call",
  //       called: second,
  //       args: [
  //         { kind: "number", value: 0 },
  //         { kind: "string", value: "" },
  //       ],
  //     })
  //   ).toEqual<BuiltinType>({ tag: "String" })
  // })
})
