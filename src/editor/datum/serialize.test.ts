import { Parser } from "./parse"
import { serializeDatum } from "./serialize"

describe("evaluate", () => {
  it("round trips", () => {
    const original = "(lambda () 42 (or . (#t #f)))"
    const serialized = serializeDatum(Parser.parseToDatum(original))
    expect(serialized).toEqual(original)
  })
})
