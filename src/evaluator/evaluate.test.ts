import { Parser } from "../expr/parse"
import { Parser as DatumParser } from "../datum/parse"
import { Lambda } from "../expr/expr"
import { Stack } from "./environment"
import { Evaluator } from "./evaluate"
import { FnValue, Value } from "./value"
import { datumEqual } from "../datum/equality"

describe("evaluate", () => {
  let evaluator: Evaluator
  beforeEach(() => {
    evaluator = new Evaluator()
    evaluator.env = new Stack()
  })

  it("evals literal values", () => {
    expect(evaluator.eval({ kind: "number", value: 42 })).toEqual<Value>({ kind: "number", value: 42 })
    expect(evaluator.eval({ kind: "bool", value: true })).toEqual<Value>({ kind: "bool", value: true })
    expect(evaluator.eval({ kind: "string", value: "hello" })).toEqual<Value>({ kind: "string", value: "hello" })
  })

  it("evals variables", () => {
    expect(() => evaluator.eval({ kind: "var", id: "x" })).toThrow()
    expect(evaluator.eval({ kind: "var", id: "x" }, new Stack<Value>({ x: { kind: "number", value: 42 } }))).toEqual<Value>({
      kind: "number",
      value: 42,
    })
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
    ).toEqual<Value>({ kind: "string", value: "result" })
  })

  it("evals procedures", () => {
    const const42: Lambda = { kind: "lambda", params: [], body: { kind: "number", value: 42 } }
    expect(evaluator.eval(const42)).toEqual<Value>({ kind: "fn", signature: [], body: { kind: "number", value: 42 } })
    expect(evaluator.eval({ kind: "call", called: const42, args: [] })).toEqual<Value>({ kind: "number", value: 42 })
  })

  it("evals unary functions", () => {
    const id: Lambda = { kind: "lambda", params: [{ kind: "name-binding", id: "x" }], body: { kind: "var", id: "x" } }
    expect(evaluator.eval(id)).toEqual<Value>({ kind: "fn", signature: [{ name: "x" }], body: { kind: "var", id: "x" } })
    expect(evaluator.eval({ kind: "call", called: id, args: [{ kind: "number", value: 42 }] })).toEqual<Value>({
      kind: "number",
      value: 42,
    })
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
    expect(evaluator.eval(second)).toEqual<Value>({
      kind: "fn",
      signature: [{ name: "x" }, { name: "y" }],
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
    ).toEqual<Value>({ kind: "string", value: "" })
  })

  it("evals quote and returns value verbatim", () => {
    const quoteResult = evaluator.eval(Parser.parseToExpr("(quote (1 #t abc () (2 3)))"))
    const datum = DatumParser.parseToDatum("(1 #t abc () (2 3))")
    expect(datumEqual(quoteResult, datum))
  })

  it("evals calls to builtins", () => {
    const consResult = evaluator.eval(Parser.parseToExpr("(cons 3 (cons 2 (cons 1 (null))))"))
    const datum = DatumParser.parseToDatum("(3 2 1)")
    expect(datumEqual(consResult, datum)).toBeTruthy()
  })

  it("checks the types of function parameters", () => {
    const body: FnValue["body"] = () => {
      return { kind: "list", heads: [] }
    }

    // No formal, one actual
    expect(() => evaluator.call({ kind: "fn", signature: [], body }, [{ kind: "bool", value: true }])).toThrow()

    // One formal, no actual
    expect(() => evaluator.call({ kind: "fn", signature: [{ name: "x", type: "Boolean" }], body }, [])).toThrow()

    // One formal, one actual, type mismatch
    expect(() =>
      evaluator.call({ kind: "fn", signature: [{ name: "x", type: "Number" }], body }, [{ kind: "bool", value: true }])
    ).toThrow()

    // Variadic formal, no actual
    expect(() => evaluator.call({ kind: "fn", signature: [{ name: "x", variadic: true }], body }, [])).not.toThrow()

    // Variadic formal, 2 actual
    expect(() =>
      evaluator.call({ kind: "fn", signature: [{ name: "x", variadic: true }], body }, [
        { kind: "bool", value: true },
        { kind: "number", value: 123 },
      ])
    ).not.toThrow()
  })
})
