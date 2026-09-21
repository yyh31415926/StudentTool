export type BaseId = "binary" | "octal" | "decimal" | "hexadecimal";

export type BaseDefinition = {
  id: BaseId;
  radix: 2 | 8 | 10 | 16;
  name: string;
};

export type BaseConversionResult = Readonly<Record<BaseId, string>>;

export const baseDefinitions: readonly BaseDefinition[] = [
  { id: "binary", radix: 2, name: "二进制" },
  { id: "octal", radix: 8, name: "八进制" },
  { id: "decimal", radix: 10, name: "十进制" },
  { id: "hexadecimal", radix: 16, name: "十六进制" },
] as const;

function getBaseDefinition(baseId: string) {
  return baseDefinitions.find((base) => base.id === baseId);
}

function getDigitValue(character: string) {
  const code = character.toUpperCase().charCodeAt(0);

  if (code >= 48 && code <= 57) {
    return code - 48;
  }

  if (code >= 65 && code <= 70) {
    return code - 55;
  }

  return -1;
}

function parseInteger(input: string, base: BaseDefinition): bigint {
  let value = BigInt(0);

  for (const character of input) {
    const digit = getDigitValue(character);

    if (digit < 0 || digit >= base.radix) {
      throw new Error("输入包含非法字符，请根据所选进制输入整数。");
    }

    value = value * BigInt(base.radix) + BigInt(digit);
  }

  return value;
}

function normalizeInput(input: string, base: BaseDefinition) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("请输入整数。");
  }

  let sign = "";
  let digits = trimmed;

  if (digits.startsWith("+") || digits.startsWith("-")) {
    sign = digits[0] === "-" ? "-" : "";
    digits = digits.slice(1);
  }

  if (!digits) {
    throw new Error("请输入整数。");
  }

  if (digits.includes(".")) {
    throw new Error("暂不支持小数，请输入整数。");
  }

  if (base.id === "hexadecimal" && /^0x/i.test(digits)) {
    digits = digits.slice(2);
  } else if (/^0[xbo]/i.test(digits)) {
    throw new Error("仅十六进制输入支持 0x / 0X 前缀。");
  }

  if (!digits) {
    throw new Error("请输入整数。");
  }

  return { sign, digits };
}

export function convertBase(
  input: string,
  inputBaseId: string,
): BaseConversionResult {
  if (typeof input !== "string") {
    throw new TypeError("输入必须是数字字符串。");
  }

  const inputBase = getBaseDefinition(inputBaseId);

  if (!inputBase) {
    throw new RangeError("不支持的输入进制。");
  }

  const { sign, digits } = normalizeInput(input, inputBase);
  const parsed = parseInteger(digits, inputBase);
  const signedValue = sign === "-" ? -parsed : parsed;

  return Object.fromEntries(
    baseDefinitions.map((base) => {
      const output = signedValue.toString(base.radix);
      return [
        base.id,
        base.id === "hexadecimal" ? output.toUpperCase() : output,
      ];
    }),
  ) as BaseConversionResult;
}

export function runBaseConversion(input: unknown): BaseConversionResult {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("进制转换需要结构化输入。");
  }

  const candidate = input as { value?: unknown; inputBaseId?: unknown };

  if (
    typeof candidate.value !== "string" ||
    typeof candidate.inputBaseId !== "string"
  ) {
    throw new TypeError("进制转换输入格式无效。");
  }

  return convertBase(candidate.value, candidate.inputBaseId);
}
