const BASE64_STANDARD_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
const BASE64_URL_SAFE_PATTERN = /^[A-Za-z0-9_-]*={0,2}$/;

function withoutWhitespace(input: string): string {
  return input.replace(/\s/g, "");
}

function hasValidBase64Shape(
  input: string,
  pattern: RegExp,
): boolean {
  if (!input || !pattern.test(input)) {
    return false;
  }

  const paddingStart = input.indexOf("=");
  const body = paddingStart === -1 ? input : input.slice(0, paddingStart);
  const paddingLength = paddingStart === -1 ? 0 : input.length - paddingStart;

  if (body.length % 4 === 1 || (paddingLength > 0 && input.length % 4 !== 0)) {
    return false;
  }

  if (
    (paddingLength === 1 && body.length % 4 !== 3) ||
    (paddingLength === 2 && body.length % 4 !== 2)
  ) {
    return false;
  }

  return true;
}

function decodeUtf8Base64(input: string, isUrlSafe: boolean): string {
  const normalized = withoutWhitespace(input);
  const standardInput = isUrlSafe
    ? normalized.replace(/-/g, "+").replace(/_/g, "/")
    : normalized;
  const paddedInput = standardInput.padEnd(
    standardInput.length + ((4 - (standardInput.length % 4)) % 4),
    "=",
  );

  let binary: string;
  try {
    binary = atob(paddedInput);
  } catch {
    throw new Error(
      "输入看起来像 Base64，但格式不合法；请检查字符、填充符号（=）和长度。",
    );
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(
      "输入是合法 Base64，但解码结果不是有效 UTF-8 文本；请确认使用 UTF-8 编码后再解码。",
    );
  }
}

function encodeUtf8Base64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }

  return btoa(binary);
}

function looksLikeMalformedBase64(input: string): boolean {
  if (input.length < 8 || /\s/.test(input)) {
    return false;
  }

  const base64Characters = input.match(/[A-Za-z0-9+/=_-]/g)?.length ?? 0;
  return base64Characters >= input.length - 1;
}

/**
 * Automatically encodes text or decodes Base64 text.
 *
 * Unicode input is encoded as UTF-8 before Base64 conversion. Base64 input
 * may use either the standard alphabet or the URL-safe `-_` alphabet.
 */
export function runBase64Transform(input: unknown): string {
  if (typeof input !== "string") {
    throw new TypeError("Base64 转换只接受文本输入。请输入字符串后重试。");
  }

  if (!input.trim()) {
    throw new Error("请输入要转换的文本；空输入无法进行 Base64 转换。");
  }

  if (Array.from(input).some((character) => character.charCodeAt(0) > 0x7f)) {
    return encodeUtf8Base64(input);
  }

  const normalized = withoutWhitespace(input);
  const standardShape = hasValidBase64Shape(
    normalized,
    BASE64_STANDARD_PATTERN,
  );
  const urlSafeShape = hasValidBase64Shape(
    normalized,
    BASE64_URL_SAFE_PATTERN,
  );
  const hasUrlSafeMarker = /[-_]/.test(normalized);
  const hasStandardMarker = /[+/=]/.test(normalized);
  const isUnpaddedUrlSafeCandidate =
    urlSafeShape && !normalized.includes("=") && normalized.length % 4 !== 0;

  if (!standardShape && !urlSafeShape && looksLikeMalformedBase64(input)) {
    throw new Error(
      "输入看起来像 Base64，但格式不合法；请检查字符、填充符号（=）和长度。",
    );
  }

  if (urlSafeShape && (hasUrlSafeMarker || isUnpaddedUrlSafeCandidate)) {
    return decodeUtf8Base64(normalized, true);
  }

  if (standardShape && (normalized.length >= 8 || hasStandardMarker)) {
    return decodeUtf8Base64(normalized, false);
  }

  return encodeUtf8Base64(input);
}
