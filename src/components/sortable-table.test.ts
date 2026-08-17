import { describe, expect, it } from "vitest";
import { compareSortValues } from "./sortable-table";

describe("compareSortValues", () => {
  it("compares numbers numerically", () => {
    expect(compareSortValues(10_000, 100_000)).toBeLessThan(0);
    expect(compareSortValues(50_000, 20_000)).toBeGreaterThan(0);
  });

  it("compares strings with Spanish collation, accent-insensitive", () => {
    expect(compareSortValues("Álvarez", "Arango")).toBeLessThan(0);
    expect(compareSortValues("ana", "Ana")).toBe(0);
  });

  it("compares embedded numbers naturally", () => {
    expect(compareSortValues("EMP-002", "EMP-010")).toBeLessThan(0);
  });

  it("sorts nulls last", () => {
    expect(compareSortValues(null, 5)).toBeGreaterThan(0);
    expect(compareSortValues("x", null)).toBeLessThan(0);
    expect(compareSortValues(null, null)).toBe(0);
  });
});
