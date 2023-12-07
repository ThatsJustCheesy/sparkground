import { Lambda } from "../typechecker/ast/ast"
import { Environment, Evaluator } from "./evaluate"
import { Fn } from "./value"

describe("evaluate", () => {
  let evaluator: Evaluator
  beforeEach(() => {
    evaluator = new Evaluator()
  })

  it("evals literal values", () => {
    expect(evaluator.eval({ kind: "number", value: 42 })).toEqual(42)
    expect(evaluator.eval({ kind: "bool", value: true })).toEqual(true)
    expect(evaluator.eval({ kind: "string", value: "hello" })).toEqual("hello")
    expect(evaluator.eval({ kind: "null" })).toEqual([])
  })

  it("evals variables", () => {
    expect(() => evaluator.eval({ kind: "var", id: "x" })).toThrow()
    // expect(inferrer.error?.tag).toEqual("UnboundVariable")
    expect(evaluator.eval({ kind: "var", id: "x" }, new Environment({ x: 42 }))).toEqual(42)
  })

  it("evals sequences", () => {
    expect(
      evaluator.eval({
        kind: "sequence",
        exprs: [
          { kind: "bool", value: false },
          { kind: "string", value: "result" },
        ],
      })
    ).toEqual("result")
  })

  it("evals procedures", () => {
    const const42: Lambda = { kind: "lambda", params: [], body: { kind: "number", value: 42 } }
    expect(evaluator.eval(const42)).toEqual<Fn>({ params: [], body: { kind: "number", value: 42 } })
    expect(evaluator.eval({ kind: "call", called: const42, args: [] })).toEqual(42)
  })

  it("evals unary functions", () => {
    const id: Lambda = { kind: "lambda", params: [{ kind: "name-binding", id: "x" }], body: { kind: "var", id: "x" } }
    expect(evaluator.eval(id)).toEqual<Fn>({ params: ["x"], body: { kind: "var", id: "x" } })
    expect(evaluator.eval({ kind: "call", called: id, args: [{ kind: "number", value: 42 }] })).toEqual(42)
  })

  it("evals binary functions", () => {
    const second: Lambda = {
      kind: "lambda",
      params: [
        { kind: "name-binding", id: "x" },
        { kind: "name-binding", id: "y" },
      ],
      body: { kind: "var", id: "y" },
    }
    expect(evaluator.eval(second)).toEqual<Fn>({
      params: ["x", "y"],
      body: { kind: "var", id: "y" },
    })
    expect(
      evaluator.eval({
        kind: "call",
        called: second,
        args: [
          { kind: "number", value: 0 },
          { kind: "string", value: "" },
        ],
      })
    ).toEqual("")
  })
})
