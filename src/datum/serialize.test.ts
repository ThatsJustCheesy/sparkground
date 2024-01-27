import { Parser } from "./parse"
import { serializeDatum } from "./serialize"

describe("serialize", () => {
  it("round trips lambdas", () => {
    const original = "(lambda () 42 (or . (#t #f)))"
    const serialized = serializeDatum(Parser.parseToDatum(original))
    expect(serialized).toEqual(original)
  })

  it("round trips calls", () => {
    const original = "(cons 0 (quote ()))"
    const serialized = serializeDatum(Parser.parseToDatum(original))
    expect(serialized).toEqual(original)
  })
})
