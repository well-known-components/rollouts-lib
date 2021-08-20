import { normalizedValue, calculateRollout, patchRollouts, calculateRolloutsForDomain, RolloutDomain } from "../src"
import expect from "expect"

describe("normalizedValue", () => {
  it("deterministicness userId", () => {
    const a1 = normalizedValue({ userId: "a" }, { percentage: 0, prefix: "", version: "" })
    const a2 = normalizedValue({ userId: "a" }, { percentage: 0, prefix: "", version: "" })
    const b1 = normalizedValue({ userId: "b" }, { percentage: 0, prefix: "", version: "" })
    expect(a1).toEqual(a2)
    expect(a1).not.toEqual(b1)
  })

  it("deterministicness sessionId", () => {
    const a1 = normalizedValue({ sessionId: "a" }, { percentage: 0, prefix: "", version: "" })
    const a2 = normalizedValue({ sessionId: "a" }, { percentage: 0, prefix: "", version: "" })
    const b1 = normalizedValue({ sessionId: "b" }, { percentage: 0, prefix: "", version: "" })
    expect(a1).toEqual(a2)
    expect(a1).not.toEqual(b1)
  })

  it("deterministicness remoteAddress", () => {
    const a1 = normalizedValue({ remoteAddress: "a" }, { percentage: 0, prefix: "", version: "" })
    const a2 = normalizedValue({ remoteAddress: "a" }, { percentage: 0, prefix: "", version: "" })
    const b1 = normalizedValue({ remoteAddress: "b" }, { percentage: 0, prefix: "", version: "" })
    expect(a1).toEqual(a2)
    expect(a1).not.toEqual(b1)
  })

  it("non deterministicness empty context", () => {
    const a = normalizedValue({}, { percentage: 0, prefix: "", version: "" })
    const b = normalizedValue({}, { percentage: 0, prefix: "", version: "" })
    const c = normalizedValue({}, { percentage: 0, prefix: "", version: "" })
    expect(a).not.toEqual(b)
    expect(b).not.toEqual(c)
  })
})

describe("calculateRollout", () => {
  it("throws if empty rollouts", () => {
    expect(() => calculateRollout({}, [])).toThrow()
  })

  it("selects the last one every time, even if percentage is zero", () => {
    const rollout = { percentage: 1, prefix: "", version: "" }
    expect(calculateRollout({}, [rollout])).toEqual(rollout)
  })

  it("selects the last one every time, even if percentage is zero", () => {
    const rollout = { percentage: 0, prefix: "", version: "" }
    expect(calculateRollout({}, [rollout])).toEqual(rollout)
  })
})

describe("calculateRollout", () => {
  it("throws if empty rollouts", () => {
    expect(() => calculateRollout({}, [])).toThrow()
  })

  it("selects the last one every time, even if percentage is zero", () => {
    const rollout = { percentage: 1, prefix: "", version: "" }
    expect(calculateRollout({}, [rollout])).toEqual(rollout)
  })

  it("selects the last one every time, even if percentage is zero", () => {
    const rollout = { percentage: 0, prefix: "", version: "" }
    expect(calculateRollout({}, [rollout])).toEqual(rollout)
  })
})

describe("patchRollouts", () => {
  it("creation from empty domain", () => {
    const result = patchRollouts({}, "_site", { prefix: "package", percentage: 10, version: "0.1.1" }, 123)

    expect(result.records).toEqual({
      _site: [{ percentage: 10, prefix: "package", version: "0.1.1", updatedAt: 123, createdAt: 123 }],
    })
  })

  it("should replace percentage of existing rollout", () => {
    let result = patchRollouts({}, "_site", { prefix: "package", percentage: 10, version: "0.1.1" }, 123)
    result = patchRollouts(result, "_site", { prefix: "package", percentage: 99, version: "0.1.1" }, 124)

    expect(result.records).toEqual({
      _site: [{ percentage: 99, prefix: "package", version: "0.1.1", updatedAt: 124, createdAt: 123 }],
    })
  })

  it("should add new versions", () => {
    let result = patchRollouts({}, "_site", { prefix: "package", percentage: 10, version: "0.1.1" }, 123)
    result = patchRollouts(result, "_site", { prefix: "package-beta", percentage: 99, version: "0.0.1-beta.test" }, 124)
    result = patchRollouts(result, "_site", { prefix: "package", percentage: 100, version: "0.1.2" }, 125)

    expect(result.records).toEqual({
      _site: [
        { percentage: 100, prefix: "package", version: "0.1.2", updatedAt: 125, createdAt: 125 },
        { percentage: 10, prefix: "package", version: "0.1.1", updatedAt: 123, createdAt: 123 },
        { percentage: 99, prefix: "package-beta", version: "0.0.1-beta.test", updatedAt: 124, createdAt: 124 },
      ],
    })
  })

  it("should add new versions", () => {
    let result = patchRollouts({}, "_site", { prefix: "package", percentage: 10, version: "0.1.1" }, 123)
    result = patchRollouts(result, "_site", { prefix: "package-beta", percentage: 99, version: "0.0.1-beta.test" }, 124)
    result = patchRollouts(result, "_site", { prefix: "package", percentage: 100, version: "0.1.2" }, 125)
    result = patchRollouts(result, "@a/a", { prefix: "@a/a", percentage: 100, version: "3.1.2" }, 126)

    expect(result.records).toEqual({
      _site: [
        { percentage: 100, prefix: "package", version: "0.1.2", updatedAt: 125, createdAt: 125 },
        { percentage: 10, prefix: "package", version: "0.1.1", updatedAt: 123, createdAt: 123 },
        { percentage: 99, prefix: "package-beta", version: "0.0.1-beta.test", updatedAt: 124, createdAt: 124 },
      ],
      "@a/a": [{ percentage: 100, prefix: "@a/a", version: "3.1.2", updatedAt: 126, createdAt: 126 }],
    })
  })

  it("should fail on invalid percentages", () => {
    expect(() => patchRollouts({}, "_site", { prefix: "package", percentage: 1000, version: "0.1.1" }, 123)).toThrow()
    expect(() => patchRollouts({}, "_site", { prefix: "package", percentage: -100, version: "0.1.1" }, 123)).toThrow()
    expect(() =>
      patchRollouts({}, "_site", { prefix: "package", percentage: "asd" as any, version: "0.1.1" }, 123)
    ).toThrow()
    expect(() => patchRollouts({}, "_site", { prefix: "package", percentage: 101, version: "0.1.1" }, 123)).toThrow()
    expect(() =>
      patchRollouts({}, "_site", { prefix: "package", percentage: "" as any, version: "0.1.1" }, 123)
    ).toThrow()
    expect(() =>
      patchRollouts({}, "_site", { prefix: "package", percentage: null as any, version: "0.1.1" }, 123)
    ).toThrow()
  })

  it("should fail on invalid versions", () => {
    expect(() => patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: "watermelon" }, 123)).toThrow()
    expect(() => patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: "" }, 123)).toThrow()
    expect(() => patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: "asd-0.1.1" }, 123)).toThrow()
    expect(() => patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: null as any }, 123)).toThrow()
    expect(() =>
      patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: new Date() as any }, 123)
    ).toThrow()
  })

  it("should fail on invalid rolloutName", () => {
    expect(() => patchRollouts({}, "", { prefix: "package", percentage: 1, version: "1.1.1" }, 123)).toThrow()
    expect(() => patchRollouts({}, 123 as any, { prefix: "package", percentage: 1, version: "1.1.1" }, 123)).toThrow()
    expect(() => patchRollouts({}, null as any, { prefix: "package", percentage: 1, version: "1.1.1" }, 123)).toThrow()
    expect(() => patchRollouts({}, {} as any, { prefix: "package", percentage: 1, version: "1.1.1" }, 123)).toThrow()
  })

  it("should fail on invalid timestamp", () => {
    expect(() =>
      patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: "1.1.1" }, null as any)
    ).toThrow()
    expect(() =>
      patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: "1.1.1" }, "123" as any)
    ).toThrow()
    expect(() =>
      patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: "1.1.1" }, {} as any)
    ).toThrow()
    expect(() => patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: "1.1.1" }, 0)).toThrow()
    expect(() => patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: "1.1.1" }, -123)).toThrow()

    expect(
      patchRollouts({}, "_site", { prefix: "package", percentage: 1, version: "1.1.1" }).records._site[0].createdAt
    ).toBeGreaterThan(0)
  })
})

describe("integration", () => {
  it("should calculate rollotus with 100%", () => {
    let domain = patchRollouts({}, "_site", { prefix: "package", percentage: 10, version: "0.1.1" }, 123)
    domain = patchRollouts(domain, "_site", { prefix: "package-beta", percentage: 99, version: "0.0.1-beta.test" }, 124)
    domain = patchRollouts(domain, "_site", { prefix: "package", percentage: 100, version: "0.1.2" }, 125)
    domain = patchRollouts(domain, "@a/a", { prefix: "@a/a", percentage: 100, version: "3.1.2" }, 126)

    expect(calculateRolloutsForDomain({}, domain)).toEqual({
      _site: { percentage: 100, prefix: "package", version: "0.1.2", updatedAt: 125, createdAt: 125 },
      "@a/a": { percentage: 100, prefix: "@a/a", version: "3.1.2", updatedAt: 126, createdAt: 126 },
    })
  })
  it("should calculate rollotus even if the domain is malformed", () => {
    expect(calculateRolloutsForDomain({}, {})).toEqual({})
  })
  it("should calculate rollotus even if the domain is malformed with empty arrays", () => {
    expect(calculateRolloutsForDomain({}, { records: { _site: [] } })).toEqual({})
  })
})
