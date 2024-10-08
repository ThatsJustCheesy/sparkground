import { Lambda } from "../expr/expr"
import { TypecheckError } from "./errors"
import { Any, BuiltinType } from "./type"
import { Typechecker } from "./typecheck"

describe("Typechecker", () => {
  let checker: Typechecker

  let const42: Lambda
  let intIdentity: Lambda
  let numberIdentity: Lambda
  let intStringFirst: Lambda
  let intStringSecond: Lambda
  let callIntToNumber: Lambda
  let uncallable: Lambda

  beforeEach(() => {
    checker = new Typechecker()
    checker.autoReset = true

    const42 = { kind: "lambda", params: [], body: { kind: "Number", value: 42 } }
    intIdentity = {
      kind: "lambda",
      params: [{ kind: "name-binding", id: "x", type: { tag: "Integer" } }],
      body: { kind: "var", id: "x" },
    }
    numberIdentity = {
      kind: "lambda",
      params: [{ kind: "name-binding", id: "x", type: { tag: "Number" } }],
      body: { kind: "var", id: "x" },
    }
    intStringFirst = {
      kind: "lambda",
      params: [
        { kind: "name-binding", id: "x", type: { tag: "Integer" } },
        { kind: "name-binding", id: "y", type: { tag: "String" } },
      ],
      body: { kind: "var", id: "x" },
    }
    intStringSecond = {
      kind: "lambda",
      params: [
        { kind: "name-binding", id: "x", type: { tag: "Integer" } },
        { kind: "name-binding", id: "y", type: { tag: "String" } },
      ],
      body: { kind: "var", id: "y" },
    }
    callIntToNumber = {
      kind: "lambda",
      params: [
        { kind: "name-binding", id: "f", type: { tag: "Function", of: [{ tag: "Integer" }, { tag: "Number" }] } },
        { kind: "name-binding", id: "x", type: { tag: "Integer" } },
      ],
      body: { kind: "call", called: { kind: "var", id: "f" }, args: [{ kind: "var", id: "x" }] },
    }
    uncallable = {
      kind: "lambda",
      params: [{ kind: "name-binding", id: "x", type: { tag: "Never" } }],
      body: { kind: "var", id: "x" },
    }
  })

  function expectNoErrors() {
    const errors = checker.errors.all()
    expect(errors).toEqual([])
  }

  it("infers basic atomic types", () => {
    expect(checker.inferType({ kind: "Number", value: 42 })).toEqual<BuiltinType>({ tag: "Integer" })
    expectNoErrors()

    expect(checker.inferType({ kind: "Boolean", value: true })).toEqual<BuiltinType>({ tag: "Boolean" })
    expectNoErrors()

    expect(checker.inferType({ kind: "String", value: "hello" })).toEqual<BuiltinType>({ tag: "String" })
    expectNoErrors()
  })

  it("infers variable types", () => {
    expect(checker.inferType({ kind: "var", id: "x" }, { x: { tag: "Integer" } })).toEqual<BuiltinType>({ tag: "Integer" })
    expectNoErrors()
  })

  it("complains about unbound variables", () => {
    checker.inferType({ kind: "var", id: "x" })
    expect(checker.errors.all()[0]?.tag).toEqual("UnboundVariable")
  })

  it("infers sequence types", () => {
    expect(
      checker.inferType({
        kind: "sequence",
        exprs: [
          { kind: "Number", value: 0 },
          { kind: "Boolean", value: false },
        ],
      }),
    ).toEqual<BuiltinType>({ tag: "Boolean" })
    expectNoErrors()
  })

  it("infers function types", () => {
    expect(checker.inferType(const42)).toEqual<BuiltinType>({ tag: "Function", of: [{ tag: "Integer" }] })
    expectNoErrors()

    expect(checker.inferType(intIdentity)).toEqual<BuiltinType>({ tag: "Function", of: [{ tag: "Integer" }, { tag: "Integer" }] })
    expectNoErrors()

    expect(checker.inferType(numberIdentity)).toEqual<BuiltinType>({ tag: "Function", of: [{ tag: "Number" }, { tag: "Number" }] })
    expectNoErrors()

    expect(checker.inferType(intStringFirst)).toEqual<BuiltinType>({
      tag: "Function",
      of: [{ tag: "Integer" }, { tag: "String" }, { tag: "Integer" }],
    })
    expectNoErrors()

    expect(checker.inferType(intStringSecond)).toEqual<BuiltinType>({
      tag: "Function",
      of: [{ tag: "Integer" }, { tag: "String" }, { tag: "String" }],
    })
    expectNoErrors()

    expect(checker.inferType(callIntToNumber)).toEqual<BuiltinType>({
      tag: "Function",
      of: [{ tag: "Function", of: [{ tag: "Integer" }, { tag: "Number" }] }, { tag: "Integer" }, { tag: "Number" }],
    })
    expectNoErrors()

    expect(checker.inferType(uncallable)).toEqual<BuiltinType>({ tag: "Function", of: [{ tag: "Never" }, { tag: "Never" }] })
    expectNoErrors()
  })

  it("infers call types", () => {
    expect(checker.inferType({ kind: "call", called: const42, args: [] })).toEqual<BuiltinType>({ tag: "Integer" })
    expectNoErrors()

    expect(checker.inferType({ kind: "call", called: intIdentity, args: [{ kind: "Number", value: 42 }] })).toEqual<BuiltinType>({
      tag: "Integer",
    })
    expectNoErrors()

    expect(checker.inferType({ kind: "call", called: numberIdentity, args: [{ kind: "Number", value: 42 }] })).toEqual<BuiltinType>({
      tag: "Number",
    })
    expectNoErrors()

    expect(
      checker.inferType({
        kind: "call",
        called: intStringFirst,
        args: [
          { kind: "Number", value: 42 },
          { kind: "String", value: "foo" },
        ],
      }),
    ).toEqual<BuiltinType>({
      tag: "Integer",
    })
    expectNoErrors()

    expect(
      checker.inferType({
        kind: "call",
        called: intStringSecond,
        args: [
          { kind: "Number", value: 42 },
          { kind: "String", value: "foo" },
        ],
      }),
    ).toEqual<BuiltinType>({
      tag: "String",
    })
    expectNoErrors()

    expect(
      checker.inferType({
        kind: "call",
        called: callIntToNumber,
        args: [
          { kind: "lambda", params: [{ kind: "name-binding", id: "x" }], body: { kind: "var", id: "x" } },
          { kind: "Number", value: 42 },
        ],
      }),
    ).toEqual<BuiltinType>({
      tag: "Number",
    })
    expectNoErrors()
  })

  it("infers calls to Never type as having Never type", () => {
    expect(
      checker.inferType(
        { kind: "call", called: { kind: "var", id: "loop" }, args: [{ kind: "Number", value: 42 }] },
        { loop: { tag: "Never" } },
      ),
    ).toEqual<BuiltinType>({
      tag: "Never",
    })
    expectNoErrors()
  })

  it("complains about arity mismatch", () => {
    checker.inferType({ kind: "call", called: const42, args: [{ kind: "Number", value: 42 }] })
    expect(checker.errors.all()[0]?.tag).toEqual<TypecheckError["tag"]>("ArityMismatch")

    checker.inferType({ kind: "call", called: numberIdentity, args: [] })
    expect(checker.errors.all()[0]?.tag).toEqual<TypecheckError["tag"]>("ArityMismatch")
  })

  it("complains about invalid assignments", () => {
    checker.inferType({ kind: "call", called: intIdentity, args: [{ kind: "Number", value: 4.2 }] })
    expect(checker.errors.all()[0]?.tag).toEqual<TypecheckError["tag"]>("InvalidAssignmentToType")

    checker.inferType({ kind: "call", called: numberIdentity, args: [{ kind: "String", value: "foo" }] })
    expect(checker.errors.all()[0]?.tag).toEqual<TypecheckError["tag"]>("InvalidAssignmentToType")

    checker.inferType({
      kind: "call",
      called: {
        kind: "lambda",
        params: [
          {
            kind: "name-binding",
            id: "foo",
            type: {
              tag: "Function",
              of: [
                { tag: "Function", of: [{ tag: "Integer" }, { tag: "Number" }] },
                { tag: "Integer" },
                { tag: "Boolean" } /* should be Number */,
              ],
            },
          },
        ],
        body: {
          kind: "var",
          id: "foo",
        },
      },
      args: [callIntToNumber],
    })
    expect(checker.errors.all()[0]?.tag).toEqual<TypecheckError["tag"]>("InvalidAssignmentToType")

    checker.inferType({ kind: "call", called: uncallable, args: [{ kind: "Number", value: 42 }] })
    expect(checker.errors.all()[0]?.tag).toEqual<TypecheckError["tag"]>("InvalidAssignmentToType")
  })

  it("infers list types", () => {
    expect(
      checker.inferType({
        kind: "List",
        heads: [
          { kind: "Number", value: 42 },
          { kind: "Number", value: 24 },
        ],
      }),
    ).toEqual<BuiltinType>({ tag: "List", of: [{ tag: "Integer" }] })
    expectNoErrors()

    expect(
      checker.inferType({
        kind: "List",
        heads: [
          { kind: "Number", value: 42 },
          { kind: "Number", value: 2.4 },
        ],
      }),
    ).toEqual<BuiltinType>({ tag: "List", of: [{ tag: "Number" }] })
    expectNoErrors()

    expect(
      checker.inferType({
        kind: "List",
        heads: [
          { kind: "Number", value: 42 },
          { kind: "Boolean", value: true },
        ],
      }),
    ).toEqual<BuiltinType>({ tag: "List", of: [Any] })
    expectNoErrors()

    expect(
      checker.inferType({
        kind: "List",
        heads: [
          { kind: "List", heads: [{ kind: "Number", value: 42 }] },
          { kind: "List", heads: [{ kind: "Boolean", value: true }] },
        ],
      }),
    ).toEqual<BuiltinType>({ tag: "List", of: [{ tag: "List", of: [Any] }] })
    expectNoErrors()
  })
})
