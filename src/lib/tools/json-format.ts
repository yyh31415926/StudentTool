/**
 * JSON 格式化工具的纯函数核心。
 *
 * 不依赖 React，不读写任何外部状态：同样的输入永远得到同样的输出。
 *
 * 三条不可动摇的约定：
 *
 * 1. 合法性只由 JSON.parse 判定。下面的扫描器只负责"解释哪里错了"，
 *    绝不参与接受或拒绝输入——手写扫描器永远不会把合法 JSON 判成非法。
 *
 * 2. 格式化与压缩只改变空白，不改变数据。数字、字符串、转义写法、重复键
 *    全部按源码原样搬运，所以 18 位学号这类超出 JavaScript 精确整数范围的
 *    数字不会被改写。（若改成 JSON.parse → JSON.stringify，就会丢精度。）
 *
 * 3. 重排结果必须能再次通过 JSON.parse（输出自检），否则不返回给用户。
 */

import {
  MAX_INPUT_LENGTH,
  MAX_NESTING_DEPTH,
  MAX_OUTPUT_LENGTH,
} from "./limits";

const INDENT_UNIT = "  ";
const BOM = "\uFEFF";
const MAX_FRAGMENT_LENGTH = 24;
const MAX_KEY_FRAGMENT_LENGTH = 16;

const NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/** 这些字面量在别的语言里合法，在 JSON 里不合法，需要单独提示。 */
const FOREIGN_LITERALS = new Set([
  "undefined",
  "NaN",
  "Infinity",
  "-Infinity",
  "True",
  "False",
  "None",
  "nil",
  "NULL",
]);

/** 全角符号 → 对应的半角写法。中文输入法下是最常见的错误来源。 */
const FULLWIDTH_SYMBOLS: Readonly<Record<string, string>> = {
  "，": ",",
  "、": ",",
  "：": ":",
  "；": ";",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "（": "(",
  "）": ")",
  "｛": "{",
  "｝": "}",
  "［": "[",
  "］": "]",
  "＝": "=",
};

/** 从别处复制内容时常混进来的不可见字符。 */
const INVISIBLE_CHARACTERS: Readonly<Record<string, string>> = {
  "\u00a0": "不换行空格",
  "\u3000": "全角空格",
  "\u200b": "零宽空格",
  "\ufeff": "字节顺序标记（BOM）",
};

export type JsonFormatAction = "format" | "minify" | "validate";

type TokenKind =
  | "lbrace"
  | "rbrace"
  | "lbracket"
  | "rbracket"
  | "comma"
  | "colon"
  | "string"
  | "unterminatedString"
  | "newlineInString"
  | "number"
  | "literal"
  | "word"
  | "comment"
  | "control"
  | "invalid";

type Token = {
  kind: TokenKind;
  start: number;
  end: number;
};

type DiagnosticContext = {
  source: string;
  lineStarts: readonly number[];
  tokens: readonly Token[];
};

type Cursor = {
  index: number;
};

function fail(message: string): never {
  throw new Error(message);
}

function isWhitespaceCode(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}

function isDigitCode(code: number): boolean {
  return code >= 0x30 && code <= 0x39;
}

function isNumberStart(char: string): boolean {
  return char === "-" || char === "+" || char === "." || isDigitCode(char.charCodeAt(0));
}

function isNumberRunChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    isDigitCode(code) ||
    char === "-" ||
    char === "+" ||
    char === "." ||
    char === "e" ||
    char === "E"
  );
}

function isWordChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    char === "_" ||
    char === "$"
  );
}

/** 统一换行与 BOM，让行号列号稳定，并保证输出只用 LF。 */
function normalizeSource(text: string): string {
  const withoutBom = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  return withoutBom.replace(/\r\n?/g, "\n");
}

function collectLineStarts(source: string): number[] {
  const lineStarts = [0];

  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 0x0a) {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
}

function positionText(
  source: string,
  lineStarts: readonly number[],
  offset: number,
): string {
  const clamped = Math.max(0, Math.min(offset, source.length));
  let low = 0;
  let high = lineStarts.length - 1;
  let lineIndex = 0;

  while (low <= high) {
    const middle = (low + high) >> 1;

    if (lineStarts[middle] <= clamped) {
      lineIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return `第 ${lineIndex + 1} 行第 ${clamped - lineStarts[lineIndex] + 1} 列`;
}

function clip(text: string, maxLength = MAX_FRAGMENT_LENGTH): string {
  const characters = Array.from(text);
  const condensed = characters.join("").replace(/\n/g, "\\n").replace(/\t/g, "\\t");

  if (condensed.length <= maxLength) {
    return condensed;
  }

  return `${condensed.slice(0, maxLength)}…`;
}

function describeCharacter(char: string): string {
  if (char === " ") {
    return "空格";
  }

  if (char === "\t") {
    return "制表符（Tab）";
  }

  return `「${clip(char, 4)}」`;
}

function describeControlCharacter(code: number): {
  name: string;
  escape: string;
} {
  if (code === 0x09) {
    return { name: "制表符（Tab）", escape: "\\t" };
  }

  if (code === 0x0d) {
    return { name: "回车符", escape: "\\r" };
  }

  return {
    name: `控制字符 U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
    escape: `\\u${code.toString(16).toUpperCase().padStart(4, "0")}`,
  };
}

function scanString(
  source: string,
  start: number,
): { kind: TokenKind; start: number; end: number } {
  let index = start + 1;

  while (index < source.length) {
    const code = source.charCodeAt(index);

    if (code === 0x5c) {
      index += 2;
      continue;
    }

    if (code === 0x22) {
      return { kind: "string", start, end: index + 1 };
    }

    if (code === 0x0a) {
      return { kind: "newlineInString", start, end: index };
    }

    if (code < 0x20) {
      return { kind: "control", start: index, end: index + 1 };
    }

    index += 1;
  }

  return { kind: "unterminatedString", start, end: source.length };
}

function skipComment(source: string, start: number): number {
  if (source[start + 1] === "/") {
    let index = start + 2;

    while (index < source.length && source.charCodeAt(index) !== 0x0a) {
      index += 1;
    }

    return index;
  }

  let index = start + 2;

  while (index < source.length) {
    if (source[index] === "*" && source[index + 1] === "/") {
      return index + 2;
    }

    index += 1;
  }

  return source.length;
}

/**
 * 把源码切成记号。这个函数不会抛错：无法识别的内容会变成
 * `invalid` / `word` / `comment` 记号，由诊断器结合上下文解释。
 */
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let depth = 0;

  while (index < source.length) {
    const code = source.charCodeAt(index);

    if (isWhitespaceCode(code)) {
      index += 1;
      continue;
    }

    const start = index;
    const char = source[index];

    if (char === "{") {
      depth += 1;
      if (depth > MAX_NESTING_DEPTH) {
        return fail(
          `嵌套层级超过 ${MAX_NESTING_DEPTH} 层，无法处理。请简化结构后再运行。`,
        );
      }
      tokens.push({ kind: "lbrace", start, end: start + 1 });
      index += 1;
      continue;
    }

    if (char === "}") {
      if (depth > 0) {
        depth -= 1;
      }
      tokens.push({ kind: "rbrace", start, end: start + 1 });
      index += 1;
      continue;
    }

    if (char === "[") {
      depth += 1;
      if (depth > MAX_NESTING_DEPTH) {
        return fail(
          `嵌套层级超过 ${MAX_NESTING_DEPTH} 层，无法处理。请简化结构后再运行。`,
        );
      }
      tokens.push({ kind: "lbracket", start, end: start + 1 });
      index += 1;
      continue;
    }

    if (char === "]") {
      if (depth > 0) {
        depth -= 1;
      }
      tokens.push({ kind: "rbracket", start, end: start + 1 });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ kind: "comma", start, end: start + 1 });
      index += 1;
      continue;
    }

    if (char === ":") {
      tokens.push({ kind: "colon", start, end: start + 1 });
      index += 1;
      continue;
    }

    if (char === '"') {
      const scanned = scanString(source, index);
      tokens.push({ kind: scanned.kind, start: scanned.start, end: scanned.end });
      index = scanned.end === start ? start + 1 : scanned.end;
      continue;
    }

    if (char === "/" && (source[index + 1] === "/" || source[index + 1] === "*")) {
      const end = skipComment(source, index);
      tokens.push({ kind: "comment", start, end });
      index = end;
      continue;
    }

    if (isNumberStart(char)) {
      let end = index + 1;

      while (end < source.length && isNumberRunChar(source[end])) {
        end += 1;
      }

      tokens.push({ kind: "number", start, end });
      index = end;
      continue;
    }

    if (isWordChar(char)) {
      let end = index + 1;

      while (end < source.length && isWordChar(source[end])) {
        end += 1;
      }

      const text = source.slice(index, end);
      tokens.push({
        kind: text === "true" || text === "false" || text === "null" ? "literal" : "word",
        start,
        end,
      });
      index = end;
      continue;
    }

    if (code < 0x20) {
      tokens.push({ kind: "control", start, end: start + 1 });
      index += 1;
      continue;
    }

    tokens.push({ kind: "invalid", start, end: start + 1 });
    index += 1;
  }

  return tokens;
}

/* ------------------------------------------------------------------ *
 * 诊断：只在 JSON.parse 失败后运行，负责把"哪里错了"说清楚
 * ------------------------------------------------------------------ */

function contextAt(
  context: DiagnosticContext,
  token: Token,
): string {
  return positionText(context.source, context.lineStarts, token.start);
}

function rawTokenText(context: DiagnosticContext, token: Token): string {
  return context.source.slice(token.start, token.end);
}

function failComment(context: DiagnosticContext, token: Token): never {
  const prefix = rawTokenText(context, token).startsWith("/*") ? "/* */" : "//";

  return fail(
    `${contextAt(context, token)}出现 ${prefix} 注释。标准 JSON 不支持注释，删除注释后再运行。`,
  );
}

function failControl(context: DiagnosticContext, token: Token): never {
  const described = describeControlCharacter(context.source.charCodeAt(token.start));

  return fail(
    `${contextAt(context, token)}出现${described.name}。JSON 字符串中必须写成 ${described.escape}，其他位置不允许控制字符。`,
  );
}

function failInvalid(context: DiagnosticContext, token: Token): never {
  const char = context.source[token.start];
  const fullwidth = FULLWIDTH_SYMBOLS[char];

  if (fullwidth) {
    return fail(
      `${contextAt(context, token)}出现全角符号「${char}」。请改成半角符号「${fullwidth}」。`,
    );
  }

  const invisible = INVISIBLE_CHARACTERS[char];

  if (invisible) {
    return fail(
      `${contextAt(context, token)}出现${invisible}。它是从别处复制内容时带进来的，请删除后重试。`,
    );
  }

  if (char === "'") {
    return fail(
      `${contextAt(context, token)}出现单引号。JSON 的字符串和键必须使用双引号 "…"。`,
    );
  }

  return fail(
    `${contextAt(context, token)}出现${describeCharacter(char)}，它不是 JSON 允许的字符。JSON 只允许 {}[]:," 这些符号、字符串、数字和 true／false／null。`,
  );
}

function failUnterminatedString(context: DiagnosticContext, token: Token): never {
  if (token.kind === "newlineInString") {
    return fail(
      `${contextAt(context, token)}开始的字符串没有闭合，缺少结束的双引号 "。JSON 字符串中不能直接换行，需要写成 \\n。`,
    );
  }

  return fail(
    `${contextAt(context, token)}开始的字符串没有闭合，缺少结束的双引号 "。`,
  );
}

function failNumber(context: DiagnosticContext, token: Token): never {
  const text = rawTokenText(context, token);
  const where = contextAt(context, token);

  if (text.startsWith("+")) {
    return fail(`${where}的数字 ${clip(text)} 不能以 + 开头。JSON 数字不使用正号，请去掉 +。`);
  }

  if (text.startsWith(".")) {
    return fail(`${where}的数字 ${clip(text)} 不能以小数点开头。请写成 0${clip(text)}。`);
  }

  if (/^-?0\d/.test(text)) {
    return fail(
      `${where}的数字 ${clip(text)} 有前导 0。JSON 不允许前导 0，请写成 ${clip(text.replace(/^(-?)0+(?=\d)/, "$1"))}。`,
    );
  }

  if (/\d-/.test(text) || /--/.test(text)) {
    return fail(`${where}的数字 ${clip(text)} 中有多余的负号。两个数字之间需要逗号。`);
  }

  if (/\d\.\d*\./.test(text)) {
    return fail(`${where}的数字 ${clip(text)} 中有多个小数点。JSON 数字只能有一个小数点。`);
  }

  if (/\.[^\d]?$/.test(text) || /\.[eE]/.test(text)) {
    return fail(`${where}的数字 ${clip(text)} 的小数点后面缺少数字。`);
  }

  if (/[eE][+-]?$/.test(text) || /[eE][+-]?[^\d]/.test(text)) {
    return fail(
      `${where}的数字 ${clip(text)} 的指数部分不完整。指数写法如 1e3 或 1.5E-2。`,
    );
  }

  return fail(
    `${where}的数字 ${clip(text)} 不是合法写法。请检查正负号、小数点、前导 0 和指数写法。`,
  );
}

/**
 * 处理那些"无论出现在什么位置都是错的"记号。
 * 返回 false 表示记号本身没问题，交给调用方按上下文判断。
 */
function failMalformedToken(
  context: DiagnosticContext,
  token: Token,
  position: "value" | "key" | "member" | "extra",
): void {
  switch (token.kind) {
    case "comment":
      failComment(context, token);
      return;
    case "control":
      failControl(context, token);
      return;
    case "invalid":
      failInvalid(context, token);
      return;
    case "unterminatedString":
    case "newlineInString":
      failUnterminatedString(context, token);
      return;
    case "word": {
      const text = rawTokenText(context, token);
      const where = contextAt(context, token);

      if (position === "key") {
        fail(
          `${where}对象的键 ${clip(text, MAX_KEY_FRAGMENT_LENGTH)} 没有加引号。JSON 的键必须是双引号字符串，例如 "name"。`,
        );
      }

      if (FOREIGN_LITERALS.has(text)) {
        fail(
          `${where}出现 ${clip(text)}，它不是 JSON 的字面量。JSON 只支持 true、false 和 null。`,
        );
      }

      // 容器内部：交给调用方说"缺少 , 或 }"，比笼统地报顶层值更准确。
      if (position === "member") {
        return;
      }

      if (position === "extra") {
        fail(
          `${where}还有内容，但一个 JSON 文档只能有一个顶层值。请删除多余的内容。`,
        );
      }

      fail(
        `${where}出现 ${clip(text)}，它不是一个 JSON 值。字符串必须写在双引号里，例如 "abc"。`,
      );
      return;
    }
    default:
      return;
  }
}

function missingCloser(
  context: DiagnosticContext,
  openToken: Token,
  closer: string,
): never {
  const open = rawTokenText(context, openToken);

  return fail(
    `${contextAt(context, openToken)}的 ${open} 没有闭合，缺少 1 个 ${closer}。请补上缺少的括号。`,
  );
}

function parseValue(context: DiagnosticContext, cursor: Cursor): void {
  const token = context.tokens[cursor.index];

  if (!token) {
    return fail(
      `${positionText(context.source, context.lineStarts, context.source.length)}内容在这里结束，但还需要一个值。请补上缺少的值。`,
    );
  }

  failMalformedToken(context, token, "value");

  switch (token.kind) {
    case "string":
    case "literal":
      cursor.index += 1;
      return;
    case "number": {
      const text = rawTokenText(context, token);

      if (!NUMBER_PATTERN.test(text)) {
        failNumber(context, token);
      }

      cursor.index += 1;
      return;
    }
    case "lbrace":
      parseObject(context, cursor);
      return;
    case "lbracket":
      parseArray(context, cursor);
      return;
    case "comma":
      return fail(
        `${contextAt(context, token)}多了一个逗号：这里需要一个值。请删除多余的逗号。`,
      );
    case "colon":
      return fail(`${contextAt(context, token)}多了一个冒号：这里需要一个值。`);
    case "rbrace":
      return fail(
        `${contextAt(context, token)}这里需要一个值，但先遇到了 }。请补上缺少的值，或删除这个键值对。`,
      );
    case "rbracket":
      return fail(
        `${contextAt(context, token)}这里需要一个值，但先遇到了 ]。请补上缺少的值，或删除这个逗号。`,
      );
    default:
      return;
  }
}

function parseObject(context: DiagnosticContext, cursor: Cursor): void {
  const openToken = context.tokens[cursor.index];
  cursor.index += 1;

  const first = context.tokens[cursor.index];

  if (!first) {
    missingCloser(context, openToken, "}");
  }

  if (first.kind === "rbrace") {
    cursor.index += 1;
    return;
  }

  for (;;) {
    const key = context.tokens[cursor.index];

    if (!key) {
      missingCloser(context, openToken, "}");
    }

    failMalformedToken(context, key, "key");

    if (key.kind === "string") {
      cursor.index += 1;
    } else if (key.kind === "word" || key.kind === "number" || key.kind === "literal") {
      fail(
        `${contextAt(context, key)}对象的键 ${clip(rawTokenText(context, key), MAX_KEY_FRAGMENT_LENGTH)} 没有加引号。JSON 的键必须是双引号字符串，例如 "name"。`,
      );
    } else if (key.kind === "rbrace") {
      fail(
        `${contextAt(context, key)}有多余的逗号：JSON 不允许在 } 前保留逗号。删除该逗号即可。`,
      );
    } else if (key.kind === "comma") {
      fail(`${contextAt(context, key)}多了一个逗号：这里需要一个键。请删除多余的逗号。`);
    } else if (key.kind === "colon") {
      fail(`${contextAt(context, key)}多了一个冒号：这里需要一个键。`);
    } else {
      fail(
        `${contextAt(context, key)}这里需要一个键，但先遇到了 ${clip(rawTokenText(context, key), 4)}。JSON 的键必须是双引号字符串。`,
      );
    }

    const colon = context.tokens[cursor.index];

    if (!colon) {
      missingCloser(context, openToken, "}");
    }

    if (colon.kind !== "colon") {
      fail(
        `${contextAt(context, colon)}的键后面缺少冒号 :。JSON 的键和值之间必须用冒号分隔。`,
      );
    }

    cursor.index += 1;

    const value = context.tokens[cursor.index];

    if (value && (value.kind === "rbrace" || value.kind === "comma")) {
      fail(
        `${contextAt(context, value)}冒号后面缺少值。请补上值，或删除这个键值对。`,
      );
    }

    parseValue(context, cursor);

    const next = context.tokens[cursor.index];

    if (!next) {
      missingCloser(context, openToken, "}");
    }

    if (next.kind === "comma") {
      cursor.index += 1;

      const afterComma = context.tokens[cursor.index];

      if (!afterComma) {
        missingCloser(context, openToken, "}");
      }

      if (afterComma.kind === "rbrace") {
        fail(
          `${contextAt(context, afterComma)}有多余的逗号：JSON 不允许在 } 前保留逗号。删除该逗号即可。`,
        );
      }

      continue;
    }

    if (next.kind === "rbrace") {
      cursor.index += 1;
      return;
    }

    if (next.kind === "rbracket") {
      fail(
        `${contextAt(context, next)}缺少一个 }：对象的 } 不能写成数组的 ]。`,
      );
    }

    failMalformedToken(context, next, "member");

    fail(
      `${contextAt(context, next)}对象里缺少 , 或 }。两个成员之间需要逗号，最后一个成员后面不需要逗号。`,
    );
  }
}

function parseArray(context: DiagnosticContext, cursor: Cursor): void {
  const openToken = context.tokens[cursor.index];
  cursor.index += 1;

  const first = context.tokens[cursor.index];

  if (!first) {
    missingCloser(context, openToken, "]");
  }

  if (first.kind === "rbracket") {
    cursor.index += 1;
    return;
  }

  for (;;) {
    const item = context.tokens[cursor.index];

    if (!item) {
      missingCloser(context, openToken, "]");
    }

    failMalformedToken(context, item, "value");

    if (item.kind === "rbracket") {
      fail(
        `${contextAt(context, item)}有多余的逗号：JSON 不允许在 ] 前保留逗号。删除该逗号即可。`,
      );
    }

    if (item.kind === "comma") {
      fail(`${contextAt(context, item)}多了一个逗号：这里需要一个值。请删除多余的逗号。`);
    }

    if (item.kind === "colon") {
      fail(`${contextAt(context, item)}多了一个冒号：数组里不需要冒号。`);
    }

    if (item.kind === "rbrace") {
      fail(
        `${contextAt(context, item)}这里需要一个值，但先遇到了 }。请补上缺少的值，或删除这个逗号。`,
      );
    }

    parseValue(context, cursor);

    const next = context.tokens[cursor.index];

    if (!next) {
      missingCloser(context, openToken, "]");
    }

    if (next.kind === "comma") {
      cursor.index += 1;

      const afterComma = context.tokens[cursor.index];

      if (!afterComma) {
        missingCloser(context, openToken, "]");
      }

      if (afterComma.kind === "rbracket") {
        fail(
          `${contextAt(context, afterComma)}有多余的逗号：JSON 不允许在 ] 前保留逗号。删除该逗号即可。`,
        );
      }

      continue;
    }

    if (next.kind === "rbracket") {
      cursor.index += 1;
      return;
    }

    if (next.kind === "rbrace") {
      fail(
        `${contextAt(context, next)}缺少一个 ]：数组的 ] 不能写成对象的 }。`,
      );
    }

    failMalformedToken(context, next, "member");

    fail(
      `${contextAt(context, next)}数组里缺少 , 或 ]。两个元素之间需要逗号，最后一个元素后面不需要逗号。`,
    );
  }
}

/** 输入已经被 JSON.parse 拒绝，这里负责找出第一个问题并解释。这个函数不会正常返回。 */
function diagnose(context: DiagnosticContext): never {
  const cursor: Cursor = { index: 0 };

  parseValue(context, cursor);

  const extra = context.tokens[cursor.index];

  if (extra) {
    if (extra.kind === "rbrace" || extra.kind === "rbracket") {
      const char = extra.kind === "rbrace" ? "}" : "]";
      const matching = extra.kind === "rbrace" ? "{" : "[";

      fail(
        `${contextAt(context, extra)}多了一个 ${char}：前面没有与它配对的 ${matching}。请删除多余的括号。`,
      );
    }

    failMalformedToken(context, extra, "extra");

    fail(
      `${contextAt(context, extra)}还有内容，但一个 JSON 文档只能有一个顶层值。请删除多余的内容，或把它们放进同一个对象或数组里。`,
    );
  }

  return fail(
    "输入不是合法的标准 JSON，但未能定位到具体位置。请检查括号、引号和逗号是否配对。",
  );
}

/* ------------------------------------------------------------------ *
 * 输出：只重排空白，内容逐字符搬运
 * ------------------------------------------------------------------ */

function indent(depth: number): string {
  return INDENT_UNIT.repeat(depth);
}

function buildMinified(context: DiagnosticContext): string {
  const chunks: string[] = [];

  for (const token of context.tokens) {
    chunks.push(context.source.slice(token.start, token.end));
  }

  return chunks.join("");
}

function buildFormatted(context: DiagnosticContext): string {
  const chunks: string[] = [];
  let outputLength = 0;

  function append(...parts: string[]): void {
    for (const part of parts) {
      outputLength += part.length;
      if (outputLength > MAX_OUTPUT_LENGTH) {
        return fail("格式化结果过大，请缩小输入或降低嵌套层级后再运行。");
      }
      chunks.push(part);
    }
  }

  /** 每一层容器是否还没有内容：用来决定 {} 与 [] 是否保持单行。 */
  const emptyFrames: boolean[] = [];

  for (const token of context.tokens) {
    const text = context.source.slice(token.start, token.end);

    if (token.kind === "comma") {
      append(",", `\n${indent(emptyFrames.length)}`);
      continue;
    }

    if (token.kind === "colon") {
      append(": ");
      continue;
    }

    if (token.kind === "rbrace" || token.kind === "rbracket") {
      const frameWasEmpty = emptyFrames.pop() ?? false;
      append(frameWasEmpty ? text : `\n${indent(emptyFrames.length)}${text}`);
      continue;
    }

    if (token.kind === "lbrace" || token.kind === "lbracket") {
      if (emptyFrames.length > 0 && emptyFrames[emptyFrames.length - 1]) {
        emptyFrames[emptyFrames.length - 1] = false;
        append(`\n${indent(emptyFrames.length)}`);
      }

      append(text);
      emptyFrames.push(true);
      continue;
    }

    if (
      token.kind === "string" ||
      token.kind === "number" ||
      token.kind === "literal"
    ) {
      if (emptyFrames.length > 0 && emptyFrames[emptyFrames.length - 1]) {
        emptyFrames[emptyFrames.length - 1] = false;
        append(`\n${indent(emptyFrames.length)}`);
      }

      append(text);
      continue;
    }

    // 合法输入不会走到这里；万一 JSON.parse 接受了扫描器不认识的写法，原样保留。
    append(text);
  }

  return chunks.join("");
}

function describeTopLevel(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `数组（${value.length} 个元素）`;
  }

  if (typeof value === "object") {
    return `对象（${Object.keys(value).length} 个键）`;
  }

  if (typeof value === "string") {
    return `字符串（${value.length} 个字符）`;
  }

  if (typeof value === "number") {
    return "数字";
  }

  if (typeof value === "boolean") {
    return `布尔值（${value ? "true" : "false"}）`;
  }

  return "未知类型";
}

function countLines(text: string): number {
  return text.split("\n").length;
}

function buildValidationReport(
  context: DiagnosticContext,
  parsed: unknown,
): string {
  return [
    "校验通过：这是合法的标准 JSON。",
    `顶层类型：${describeTopLevel(parsed)}`,
    `输入 ${countLines(context.source)} 行，格式化后 ${countLines(buildFormatted(context))} 行。`,
  ].join("\n");
}

function readInput(input: unknown): { text: string; action: JsonFormatAction } {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("JSON 工具需要同时提供文本和操作类型。");
  }

  const record = input as { text?: unknown; action?: unknown };

  if (typeof record.text !== "string") {
    throw new TypeError("JSON 工具只接受文本输入。");
  }

  if (
    record.action !== "format" &&
    record.action !== "minify" &&
    record.action !== "validate"
  ) {
    throw new TypeError("未知的操作类型，请选择格式化、压缩或校验。");
  }

  return { text: record.text, action: record.action };
}

/**
 * JSON 工具的唯一入口。
 *
 * @param input `{ text, action }`，action 取 `format` | `minify` | `validate`。
 * @returns 格式化 / 压缩后的文本，或校验结论。
 * @throws Error 输入不是合法标准 JSON 时，抛出带行号、列号与修复建议的中文提示。
 */
export function runJsonFormat(input: unknown): string {
  const { text, action } = readInput(input);

  if (text.length > MAX_INPUT_LENGTH) {
    throw new Error("输入内容过长，请分次处理或粘贴更短的内容。");
  }

  const source = normalizeSource(text);

  if (!source.trim()) {
    throw new Error(
      source.length === 0
        ? "请输入需要处理的 JSON 文本。"
        : "输入只有空白字符，请粘贴或输入 JSON 内容。",
    );
  }

  const context: DiagnosticContext = {
    source,
    lineStarts: collectLineStarts(source),
    tokens: tokenize(source),
  };

  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    return diagnose(context);
  }

  if (action === "validate") {
    return buildValidationReport(context, parsed);
  }

  const output = action === "minify" ? buildMinified(context) : buildFormatted(context);

  try {
    JSON.parse(output);
  } catch {
    throw new Error("工具无法处理该输入，请检查内容后重试。");
  }

  return output;
}
