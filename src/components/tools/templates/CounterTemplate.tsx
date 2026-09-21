"use client";

import { useState } from "react";
import { countCharacters } from "@/lib/tools/char-count";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

type CounterTemplateProps = {
  exampleInput: string;
};

export function CounterTemplate({
  exampleInput,
}: CounterTemplateProps) {
  const [value, setValue] = useState("");
  const result = countCharacters(value);

  return (
    <Card className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">输入文本</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            输入内容后，统计结果会实时更新。
          </p>
        </div>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => setValue(exampleInput)}
        >
          试试示例
        </Button>
      </div>

      <Textarea
        aria-label="输入需要统计的文本"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setValue("");
          }
        }}
        placeholder="在这里输入或粘贴文本"
      />
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          尚未输入文本，统计结果显示为 0。
        </p>
      ) : null}

      <div>
        <h2 className="text-xl font-semibold">统计结果</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-control bg-surface-muted p-4">
            <dt className="text-sm text-muted-foreground">字符数</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {result.characterCount}
            </dd>
          </div>
          <div className="rounded-control bg-surface-muted p-4">
            <dt className="text-sm text-muted-foreground">中文字符数</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {result.chineseCharacterCount}
            </dd>
          </div>
          <div className="rounded-control bg-surface-muted p-4">
            <dt className="text-sm text-muted-foreground">英文单词数</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {result.englishWordCount}
            </dd>
          </div>
          <div className="rounded-control bg-surface-muted p-4">
            <dt className="text-sm text-muted-foreground">行数</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {result.lineCount}
            </dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
        <p>字符数包含空格、标点和 Emoji，但不包含换行符。</p>
        <p>中文字符数只统计汉字；英文单词按连续英文字母统计。</p>
        <p>行数按换行符计算，空字符串为 0 行，空行计入行数。</p>
      </div>
    </Card>
  );
}
