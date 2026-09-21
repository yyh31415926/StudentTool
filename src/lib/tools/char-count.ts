const LINE_BREAK_PATTERN = /\r\n?|\n/g;
const HAN_CHARACTER_PATTERN = /\p{Script=Han}/u;
const ENGLISH_WORD_PATTERN = /[A-Za-z]+/g;

export type CharCountResult = {
  characterCount: number;
  chineseCharacterCount: number;
  englishWordCount: number;
  lineCount: number;
};

function normalizeLineBreaks(input: string): string {
  return input.replace(LINE_BREAK_PATTERN, "\n");
}

export function countCharacters(input: string): CharCountResult {
  const normalizedInput = normalizeLineBreaks(input);
  const textWithoutLineBreaks = normalizedInput.replace(/\n/g, "");
  const characters = Array.from(textWithoutLineBreaks);

  return {
    characterCount: characters.length,
    chineseCharacterCount: characters.filter((character) =>
      HAN_CHARACTER_PATTERN.test(character),
    ).length,
    englishWordCount: normalizedInput.match(ENGLISH_WORD_PATTERN)?.length ?? 0,
    lineCount: input.length === 0 ? 0 : normalizedInput.split("\n").length,
  };
}
