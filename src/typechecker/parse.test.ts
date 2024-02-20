import { Parser } from "./parse"
import { Type } from "./type"

describe("evaluate", () => {
  it("parses base types", () => {
    expect(Parser.parseToType("Integer")).toStrictEqual<Type>({
      tag: "Integer",
    })
  })
  it("parses constructed types", () => {
    expect(Parser.parseToType("(Function Integer Boolean)")).toStrictEqual<Type>({
      tag: "Function",
      of: [
        {
          tag: "Integer",
        },
        {
          tag: "Boolean",
        },
      ],
    })
  })
})
