import { Expr } from "./expr"
import { Parser } from "./parse"

describe("evaluate", () => {
  it("parses lambda functions", () => {
    expect(Parser.parseToExpr("(lambda () 42)")).toStrictEqual<Expr>({
      kind: "lambda",
      params: [],
      body: {
        kind: "sequence",
        exprs: [{ kind: "Number", value: 42 }],
      },
    })
    expect(Parser.parseToExpr("(lambda (x) x)")).toStrictEqual<Expr>({
      kind: "lambda",
      params: [{ kind: "name-binding", id: "x" }],
      body: {
        kind: "sequence",
        exprs: [{ kind: "var", id: "x" }],
      },
    })
    expect(Parser.parseToExpr("(lambda (x y) y)")).toStrictEqual<Expr>({
      kind: "lambda",
      params: [
        { kind: "name-binding", id: "x" },
        { kind: "name-binding", id: "y" },
      ],
      body: { kind: "sequence", exprs: [{ kind: "var", id: "y" }] },
    })
  })

  it("parses nested calls", () => {
    expect(Parser.parseToExpr("(cons 3 (cons 2 (cons 1 (quote ()))))")).toStrictEqual<Expr>({
      kind: "call",
      called: { kind: "var", id: "cons" },
      args: [
        { kind: "Number", value: 3 },
        {
          kind: "call",
          called: { kind: "var", id: "cons" },
          args: [
            { kind: "Number", value: 2 },
            {
              kind: "call",
              called: { kind: "var", id: "cons" },
              args: [
                { kind: "Number", value: 1 },
                { kind: "List", heads: [] },
              ],
            },
          ],
        },
      ],
    })
  })
})
