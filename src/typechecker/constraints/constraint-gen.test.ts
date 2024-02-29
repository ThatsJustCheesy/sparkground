import { Any, Never } from "../type"
import { generateConstraints } from "./constraint-gen"
import { ConstraintSet } from "./constraint-set"

describe("constraint generation", () => {
  it("generates upper-bound constraints", () => {
    expect(generateConstraints(["X"], { var: "X" }, { tag: "Number" })).toEqual<ConstraintSet>({
      X: { constraint: "subtype", lowerBound: Never, upperBound: { tag: "Number" } },
    })
  })

  it("generates lower-bound constraints", () => {
    expect(
      generateConstraints(["X"], { tag: "Function", of: [{ var: "X" }, Never] }, { tag: "Function", of: [{ tag: "Integer" }, Never] })
    ).toEqual<ConstraintSet>({
      X: { constraint: "subtype", lowerBound: { tag: "Integer" }, upperBound: Any },
    })
  })
})
