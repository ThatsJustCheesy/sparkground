import { Datum } from "./datum"
import { Parser } from "./parse"

describe("evaluate", () => {
  it("parses nested lists and other values", () => {
    expect(Parser.parseToDatum("(lambda () 42 (or . (#t #f)))")).toStrictEqual<Datum>({
      kind: "List",
      heads: [
        {
          kind: "Symbol",
          value: "lambda",
        },
        {
          kind: "List",
          heads: [],
        },
        {
          kind: "Number",
          value: 42,
        },
        {
          kind: "List",
          heads: [
            {
              kind: "Symbol",
              value: "or",
            },
          ],
          tail: {
            kind: "List",
            heads: [
              {
                kind: "Boolean",
                value: true,
              },
              {
                kind: "Boolean",
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
