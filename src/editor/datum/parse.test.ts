import { Datum } from "./datum"
import { Parser } from "./parse"

describe("evaluate", () => {
  it("parses nested lists and other values", () => {
    expect(Parser.parseToDatum("(lambda () 42 (or . (#t #f)))")).toStrictEqual<Datum>({
      kind: "list",
      heads: [
        {
          kind: "symbol",
          value: "lambda",
        },
        {
          kind: "list",
          heads: [],
        },
        {
          kind: "number",
          value: 42,
        },
        {
          kind: "list",
          heads: [
            {
              kind: "symbol",
              value: "or",
            },
          ],
          tail: {
            kind: "list",
            heads: [
              {
                kind: "bool",
                value: true,
              },
              {
                kind: "bool",
                value: false,
              },
            ],
          },
        },
      ],
    })
  })

  it("rejects tail-only lists", () => {
    expect(() => Parser.parseToDatum("(.)")).toThrow()
    expect(() => Parser.parseToDatum("(. 1)")).toThrow()
  })
})
