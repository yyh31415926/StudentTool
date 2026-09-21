import { describe, expect, it } from "vitest";
import {
  baseDefinitions,
  convertBase,
  runBaseConversion,
} from "../../src/lib/tools/base-convert";

describe("base-convert", () => {
  it("converts binary to decimal", () => {
    expect(convertBase("1010", "binary").decimal).toBe("10");
  });

  it("converts binary to hexadecimal", () => {
    expect(convertBase("11111111", "binary").hexadecimal).toBe("FF");
  });

  it("converts decimal to binary", () => {
    expect(convertBase("42", "decimal").binary).toBe("101010");
  });

  it("converts decimal to hexadecimal", () => {
    expect(convertBase("255", "decimal").hexadecimal).toBe("FF");
  });

  it("converts hexadecimal to decimal", () => {
    expect(convertBase("0xFF", "hexadecimal").decimal).toBe("255");
  });

  it("converts octal to decimal", () => {
    expect(convertBase("17", "octal").decimal).toBe("15");
  });

  it("converts zero", () => {
    expect(convertBase("0000", "decimal")).toEqual({
      binary: "0",
      octal: "0",
      decimal: "0",
      hexadecimal: "0",
    });
  });

  it("supports large integers without floating-point precision loss", () => {
    const result = convertBase("340282366920938463463374607431768211455", "decimal");

    expect(result.hexadecimal).toBe("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
  });

  it("accepts uppercase hexadecimal input", () => {
    expect(convertBase("ABCD", "hexadecimal").decimal).toBe("43981");
  });

  it("accepts lowercase hexadecimal input", () => {
    expect(convertBase("abcd", "hexadecimal").decimal).toBe("43981");
  });

  it("accepts leading zeroes", () => {
    expect(convertBase("0001010", "binary").decimal).toBe("10");
  });

  it("supports negative and positive signs", () => {
    expect(convertBase("-1010", "binary").decimal).toBe("-10");
    expect(convertBase("+1010", "binary").decimal).toBe("10");
  });

  it("accepts the hexadecimal prefix only in hexadecimal mode", () => {
    expect(convertBase("0Xff", "hexadecimal").binary).toBe("11111111");
    expect(() => convertBase("0b1010", "binary")).toThrow(
      "仅十六进制输入支持",
    );
    expect(() => convertBase("0o17", "octal")).toThrow(
      "仅十六进制输入支持",
    );
  });

  it("rejects empty input", () => {
    expect(() => convertBase("", "decimal")).toThrow("请输入整数");
    expect(() => convertBase("   ", "decimal")).toThrow("请输入整数");
  });

  it("rejects decimal input", () => {
    expect(() => convertBase("10.5", "decimal")).toThrow(
      "暂不支持小数",
    );
  });

  it("rejects characters outside the selected radix", () => {
    expect(() => convertBase("102", "binary")).toThrow("输入包含非法字符");
    expect(() => convertBase("8", "octal")).toThrow("输入包含非法字符");
    expect(() => convertBase("G", "hexadecimal")).toThrow("输入包含非法字符");
  });

  it("rejects unsupported input bases", () => {
    expect(() => convertBase("10", "base-3")).toThrow("不支持的输入进制");
  });

  it("exposes the four configured bases", () => {
    expect(baseDefinitions.map((base) => [base.id, base.radix])).toEqual([
      ["binary", 2],
      ["octal", 8],
      ["decimal", 10],
      ["hexadecimal", 16],
    ]);
  });

  it("supports the ToolDefinition input shape", () => {
    expect(
      runBaseConversion({ value: "1010", inputBaseId: "binary" }).decimal,
    ).toBe("10");
    expect(() => runBaseConversion({ value: 1010 })).toThrow(
      "进制转换输入格式无效",
    );
  });
});
