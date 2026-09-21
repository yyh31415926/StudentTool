import { describe, expect, it } from "vitest";
import { countCharacters } from "../../src/lib/tools/char-count";

describe("countCharacters", () => {
  it.each([
    {
      name: "empty string",
      input: "",
      expected: { characterCount: 0, chineseCharacterCount: 0, englishWordCount: 0, lineCount: 0 },
    },
    {
      name: "spaces",
      input: "   ",
      expected: { characterCount: 3, chineseCharacterCount: 0, englishWordCount: 0, lineCount: 1 },
    },
    {
      name: "pure Chinese",
      input: "你好世界",
      expected: { characterCount: 4, chineseCharacterCount: 4, englishWordCount: 0, lineCount: 1 },
    },
    {
      name: "pure English",
      input: "Hello world",
      expected: { characterCount: 11, chineseCharacterCount: 0, englishWordCount: 2, lineCount: 1 },
    },
    {
      name: "mixed Chinese and English",
      input: "你好 hello",
      expected: { characterCount: 8, chineseCharacterCount: 2, englishWordCount: 1, lineCount: 1 },
    },
    {
      name: "numbers",
      input: "12345",
      expected: { characterCount: 5, chineseCharacterCount: 0, englishWordCount: 0, lineCount: 1 },
    },
    {
      name: "punctuation",
      input: "，!?．",
      expected: { characterCount: 4, chineseCharacterCount: 0, englishWordCount: 0, lineCount: 1 },
    },
    {
      name: "multiple lines",
      input: "第一行\nsecond",
      expected: { characterCount: 9, chineseCharacterCount: 3, englishWordCount: 1, lineCount: 2 },
    },
    {
      name: "emoji",
      input: "😀👍",
      expected: { characterCount: 2, chineseCharacterCount: 0, englishWordCount: 0, lineCount: 1 },
    },
    {
      name: "long input",
      input: "a".repeat(10_000),
      expected: { characterCount: 10_000, chineseCharacterCount: 0, englishWordCount: 1, lineCount: 1 },
    },
    {
      name: "consecutive spaces",
      input: "hello   world",
      expected: { characterCount: 13, chineseCharacterCount: 0, englishWordCount: 2, lineCount: 1 },
    },
    {
      name: "Windows line ending",
      input: "a\r\nb",
      expected: { characterCount: 2, chineseCharacterCount: 0, englishWordCount: 2, lineCount: 2 },
    },
    {
      name: "trailing line ending",
      input: "a\n",
      expected: { characterCount: 1, chineseCharacterCount: 0, englishWordCount: 1, lineCount: 2 },
    },
    {
      name: "blank lines",
      input: "\n\n",
      expected: { characterCount: 0, chineseCharacterCount: 0, englishWordCount: 0, lineCount: 3 },
    },
    {
      name: "hyphenated English words",
      input: "hello-world",
      expected: { characterCount: 11, chineseCharacterCount: 0, englishWordCount: 2, lineCount: 1 },
    },
  ])("counts $name using the documented rules", ({ input, expected }) => {
    expect(countCharacters(input)).toEqual(expected);
  });
});
