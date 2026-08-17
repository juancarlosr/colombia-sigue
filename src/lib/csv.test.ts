import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows with LF and CRLF", () => {
    expect(parseCsv("a,b\nc,d\r\ne,f")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    expect(parseCsv('"Gómez, Ana",x\n"say ""hi""",y')).toEqual([
      ["Gómez, Ana", "x"],
      ['say "hi"', "y"],
    ]);
  });

  it("ignores empty trailing lines", () => {
    expect(parseCsv("a,b\n\n")).toEqual([["a", "b"]]);
  });
});

describe("toCsv", () => {
  it("escapes fields that need quoting and round-trips", () => {
    const rows = [
      ["id", "name"],
      ["1", "Gómez, Ana"],
      ["2", 'say "hi"'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
