"use client";

import { useMemo, useState } from "react";
import { useToolUsage } from "../ToolUsageBoundary";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  baseDefinitions,
  convertBase,
  type BaseDefinition,
  type BaseId,
} from "@/lib/tools/base-convert";

type BaseConverterTemplateProps = {
  bases: readonly BaseDefinition[];
};

export function BaseConverterTemplate({
  bases,
}: BaseConverterTemplateProps) {
  const initialBaseId = bases[0]?.id ?? baseDefinitions[0].id;
  const [value, setValue] = useState("");
  const [inputBaseId, setInputBaseId] = useState<BaseId>(initialBaseId);

  const conversion = useMemo(() => {
    if (!value.trim()) {
      return { results: undefined, error: undefined };
    }

    try {
      return {
        results: convertBase(value, inputBaseId),
        error: undefined,
      };
    } catch (error) {
      return {
        results: undefined,
        error: error instanceof Error ? error.message : "输入无法转换。",
      };
    }
  }, [inputBaseId, value]);
  useToolUsage(conversion.results !== undefined);

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">输入整数</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          选择输入进制，四种进制结果会实时更新。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => { setInputBaseId("binary"); setValue("1010"); }}>试试示例</Button>
        <Button size="sm" variant="secondary" onClick={() => setValue("")}>清空</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <label className="space-y-2 text-sm font-medium">
          <span>数字</span>
          <Input
            aria-label="输入需要转换的整数"
            inputMode="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setValue("");
              }
            }}
            placeholder="例如 1010"
          />
        </label>

        <label className="space-y-2 text-sm font-medium">
          <span>输入进制</span>
          <Select
            aria-label="选择输入进制"
            value={inputBaseId}
            onChange={(event) => setInputBaseId(event.target.value as BaseId)}
          >
            {bases.map((base) => (
              <option key={base.id} value={base.id}>
                {base.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {conversion.error ? (
        <p className="text-sm text-error" role="alert">
          {conversion.error}
        </p>
      ) : null}

      <div>
        <h2 className="text-xl font-semibold">转换结果</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {bases.map((base) => (
            <div key={base.id} className="rounded-control bg-surface-muted p-4">
              <dt className="text-sm text-muted-foreground">{base.name}</dt>
              <dd className="mt-1 break-all text-2xl font-semibold tabular-nums">
                {conversion.results?.[base.id] ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
        支持整数、正负号、前导零，以及十六进制的 0x / 0X 前缀；暂不支持小数。
      </p>
      <CopyButton text={conversion.results ? bases.map((base) => `${base.name}：${conversion.results?.[base.id]}`).join("\n") : ""} />
    </Card>
  );
}
