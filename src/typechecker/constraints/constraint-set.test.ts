import { Any, Never } from "../type"
import { computeMinimalSubstitution } from "./constraint-set"

describe("constraint sets", () => {
  it("produces trivial solution for empty constraint sets", () => {
    expect(computeMinimalSubstitution({}, Any)).toEqual({})
    expect(computeMinimalSubstitution({}, { tag: "Function", of: [{ var: "X" }, { var: "X" }] })).toEqual({})
  })

  it("complains when constraints are unsatisfiable", () => {
    expect(
      computeMinimalSubstitution(
        {
          // X is bounded below and above by unrelated types
          X: { constraint: "subtype", lowerBound: { tag: "Foo" }, upperBound: { tag: "Bar" } },
        },
        Any,
      ),
    ).toBeUndefined()
  })

  it("solves when type is constant with respect to variables", () => {
    expect(
      computeMinimalSubstitution(
        {
          X: { constraint: "subtype", lowerBound: Never, upperBound: Any },
          Y: { constraint: "subtype", lowerBound: { tag: "Integer" }, upperBound: { tag: "Number" } },
        },
        Any,
      ),
    ).toEqual({ X: Never, Y: { tag: "Integer" } })
  })

  it("solves when type is covariant with respect to variables", () => {
    expect(
      computeMinimalSubstitution(
        {
          X: { constraint: "subtype", lowerBound: { tag: "Integer" }, upperBound: { tag: "Number" } },
        },
        { tag: "Function", of: [{ tag: "Integer" }, { var: "X" }] },
      ),
    ).toEqual({ X: { tag: "Integer" } })
  })

  it("solves when type is contravariant with respect to variables", () => {
    expect(
      computeMinimalSubstitution(
        {
          X: { constraint: "subtype", lowerBound: Never, upperBound: Any },
          Y: { constraint: "subtype", lowerBound: { tag: "Integer" }, upperBound: { tag: "Number" } },
        },
        { tag: "Function", of: [{ var: "X" }, { tag: "Function", of: [{ var: "Y" }] }, { tag: "Integer" }] },
      ),
    ).toEqual({ X: Any, Y: { tag: "Number" } })
  })

  it("solves when type is invariant with respect to variables and constraints are strong", () => {
    expect(
      computeMinimalSubstitution(
        {
          X: { constraint: "subtype", lowerBound: { tag: "Foo" }, upperBound: { tag: "Foo" } },
          Y: { constraint: "subtype", lowerBound: { tag: "Bar" }, upperBound: { tag: "Bar" } },
        },
        { tag: "Function", of: [{ tag: "Function", of: [{ var: "X" }, { var: "Y" }] }, { var: "X" }, { var: "Y" }] },
      ),
    ).toEqual({ X: { tag: "Foo" }, Y: { tag: "Bar" } })
  })

  it("solves (suboptimally) when type is invariant with respect to variables and constraints are too weak", () => {
    // In the original local type inference scheme, this is a failing case;
    // see the "Design choice" comment in the constraint solver definition
    // for rationale on why this is made to succeed in this way.
    expect(
      computeMinimalSubstitution(
        {
          X: { constraint: "subtype", lowerBound: Never, upperBound: Any },
          Y: { constraint: "subtype", lowerBound: { tag: "Integer" }, upperBound: { tag: "Number" } },
        },
        { tag: "Function", of: [{ tag: "Function", of: [{ var: "X" }, { var: "Y" }] }, { var: "X" }, { var: "Y" }] },
      ),
    ).toEqual({ X: Never, Y: { tag: "Integer" } })
  })

  it("solves when lower bound is a forall type", () => {
    expect(
      computeMinimalSubstitution(
        {
          X: {
            constraint: "subtype",
            lowerBound: { forall: [{ kind: "type-name-binding", id: "Y" }], body: { tag: "Function", of: [{ var: "Y" }, { var: "Y" }] } },
            upperBound: Any,
          },
        },
        { tag: "Function", of: [{ var: "X" }, { var: "X" }] },
      ),
    ).toEqual({ X: { forall: [{ kind: "type-name-binding", id: "Y" }], body: { tag: "Function", of: [{ var: "Y" }, { var: "Y" }] } } })
  })
})
