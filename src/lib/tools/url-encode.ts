const PERCENT_ESCAPE_PATTERN = /%[0-9A-Fa-f]{2}/;
const HEX_DIGIT_PATTERN = /^[0-9A-Fa-f]$/;

function hasCompletePercentEscape(input: string): boolean {
  return PERCENT_ESCAPE_PATTERN.test(input);
}

function getCharacterPosition(input: string, codeUnitIndex: number): number {
  return Array.from(input.slice(0, codeUnitIndex)).length + 1;
}

function findInvalidPercentIndex(input: string): number | undefined {
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] !== "%") {
      continue;
    }

    const firstHexDigit = input[index + 1];
    const secondHexDigit = input[index + 2];

    if (
      !firstHexDigit ||
      !secondHexDigit ||
      !HEX_DIGIT_PATTERN.test(firstHexDigit) ||
      !HEX_DIGIT_PATTERN.test(secondHexDigit)
    ) {
      return index;
    }
  }

  return undefined;
}

function hasLoneSurrogate(input: string): boolean {
  for (let index = 0; index < input.length; index += 1) {
    const codeUnit = input.charCodeAt(index);

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = input.charCodeAt(index + 1);
      if (nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) {
        return true;
      }

      index += 1;
      continue;
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }

  return false;
}

function createInvalidPercentError(input: string, index: number): Error {
  const position = getCharacterPosition(input, index);
  return new Error(
    `第 ${position} 个字符是非法百分号，% 后应该是两位十六进制。`,
  );
}

/**
 * Automatically encodes plain text or decodes percent-escaped URL text.
 *
 * A complete `%HH` escape switches the function to decode mode. The plus sign
 * is intentionally left untouched because this tool follows percent escaping
 * rules instead of query-string form decoding.
 */
export function runUrlCodec(input: unknown): string {
  if (typeof input !== "string") {
    throw new TypeError("URL 编码解码只接受文本输入。请输入字符串后重试。");
  }

  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error("输入内容过长，请分次处理或粘贴更短的内容。");
  }

  if (hasLoneSurrogate(input)) {
    throw new Error("输入包含不完整字符，请重新复制完整内容。");
  }

  if (!hasCompletePercentEscape(input)) {
    try {
      return encodeURIComponent(input);
    } catch (caughtError) {
      if (caughtError instanceof URIError) {
        throw new Error("输入包含不完整字符，请重新复制完整内容。");
      }

      throw caughtError;
    }
  }

  const invalidPercentIndex = findInvalidPercentIndex(input);
  if (invalidPercentIndex !== undefined) {
    throw createInvalidPercentError(input, invalidPercentIndex);
  }

  try {
    return decodeURIComponent(input);
  } catch (caughtError) {
    if (caughtError instanceof URIError) {
      throw new Error(
        "百分号转义无法还原成文字，请检查内容是否完整。",
      );
    }

    throw caughtError;
  }
}
import { MAX_INPUT_LENGTH } from "./limits";
