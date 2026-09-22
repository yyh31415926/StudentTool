import { describe, expect, it } from "vitest";
import {
  convertUnit,
  runUnitConversion,
  unitConvertGroups,
} from "../../src/lib/tools/unit-convert";

describe("unit-convert", () => {
  it.each([
    ["m to cm", 1, "m", "cm", 100],
    ["km to m", 2.5, "km", "m", 2500],
    ["mm to m", 10, "mm", "m", 0.01],
    ["kg to g", 3, "kg", "g", 3000],
    ["mg to g", 2500, "mg", "g", 2.5],
    ["zero", 0, "m", "km", 0],
    ["decimal", 1.25, "cm", "mm", 12.5],
    ["negative", -2, "kg", "g", -2000],
  ])(
    "converts %s",
    (_label, value, fromUnitId, toUnitId, expected) => {
      expect(convertUnit(value, fromUnitId, toUnitId)).toBeCloseTo(expected);
    },
  );

  it("contains only the first-phase length and mass units", () => {
    expect(unitConvertGroups.map((group) => group.id)).toEqual([
      "length",
      "mass",
    ]);
    expect(unitConvertGroups.flatMap((group) => group.units.map((unit) => unit.id))).toEqual([
      "mm",
      "cm",
      "m",
      "km",
      "mg",
      "g",
      "kg",
    ]);
  });

  it("rejects non-finite input", () => {
    expect(() => convertUnit(Number.NaN, "m", "cm")).toThrow(
      "换算输入必须是有限数字",
    );
    expect(() => convertUnit(Number.POSITIVE_INFINITY, "m", "cm")).toThrow(
      "换算输入必须是有限数字",
    );
  });

  it("runs the ToolDefinition input shape", () => {
    expect(
      runUnitConversion({ value: 2, fromUnitId: "m", toUnitId: "cm" }),
    ).toBe(200);
  });

  it("rejects an invalid ToolDefinition input shape", () => {
    expect(() => runUnitConversion({ value: "2" })).toThrow(
      "单位换算输入格式无效",
    );
  });

  it("rejects unknown units", () => {
    expect(() => convertUnit(1, "m", "unknown")).toThrow("未找到指定单位");
  });

  it("rejects conversions across unit groups", () => {
    expect(() => convertUnit(1, "m", "kg")).toThrow(
      "不能在不同单位类型之间换算",
    );
  });

  it("rejects conversions that overflow the representable range", () => {
    expect(() => convertUnit(Number.MAX_VALUE, "km", "mm")).toThrow(
      "换算结果超出可表示的范围",
    );
  });
});
