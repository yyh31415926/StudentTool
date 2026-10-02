"use client";

import { useMemo, useState } from "react";
import { useToolUsage } from "../ToolUsageBoundary";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  convertUnit,
  type UnitDefinition,
  type UnitGroup,
} from "@/lib/tools/unit-convert";

type ConverterTemplateProps = {
  unitGroups: readonly UnitGroup[];
};

function getInitialUnitId(group: UnitGroup, index: number) {
  return group.units[index]?.id ?? group.units[0]?.id ?? "";
}

export function ConverterTemplate({
  unitGroups,
}: ConverterTemplateProps) {
  const initialGroup = unitGroups[0];
  const [groupId, setGroupId] = useState(initialGroup?.id ?? "");
  const [value, setValue] = useState("");
  const [fromUnitId, setFromUnitId] = useState(
    initialGroup ? getInitialUnitId(initialGroup, 0) : "",
  );
  const [toUnitId, setToUnitId] = useState(
    initialGroup ? getInitialUnitId(initialGroup, 1) : "",
  );

  const selectedGroup =
    unitGroups.find((group) => group.id === groupId) ?? initialGroup;
  const conversion = useMemo(() => {
    if (!value.trim() || !selectedGroup || !fromUnitId || !toUnitId) {
      return { result: undefined, error: undefined };
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return { result: undefined, error: undefined };
    }

    try {
      return {
        result: convertUnit(numericValue, fromUnitId, toUnitId),
        error: undefined,
      };
    } catch (caughtError) {
      return {
        result: undefined,
        error: caughtError instanceof Error ? caughtError.message : "无法换算。",
      };
    }
  }, [fromUnitId, selectedGroup, toUnitId, value]);
  useToolUsage(conversion.result !== undefined);

  const hasInvalidInput =
    Boolean(value.trim()) &&
    conversion.result === undefined &&
    conversion.error === undefined;

  function handleGroupChange(nextGroupId: string) {
    const nextGroup = unitGroups.find((group) => group.id === nextGroupId);

    setGroupId(nextGroupId);
    setFromUnitId(nextGroup ? getInitialUnitId(nextGroup, 0) : "");
    setToUnitId(nextGroup ? getInitialUnitId(nextGroup, 1) : "");
  }

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">输入数值</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          选择单位类型和单位，结果会实时更新。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setValue("100")}>试试示例</Button>
        <Button size="sm" variant="secondary" onClick={() => { setFromUnitId(toUnitId); setToUnitId(fromUnitId); }}>交换单位 ⇄</Button>
        <Button size="sm" variant="secondary" onClick={() => setValue("")}>清空</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">
          <span>单位类型</span>
          <Select
            aria-label="选择单位类型"
            value={groupId}
            onChange={(event) => handleGroupChange(event.target.value)}
          >
            {unitGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-2 text-sm font-medium">
          <span>数值</span>
          <Input
            aria-label="输入需要换算的数值"
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") setValue(""); }}
            placeholder="例如 100"
          />
        </label>

        <div className="space-y-2 text-sm font-medium">
          <span>换算结果</span>
          <div
            aria-live="polite"
            className="flex min-h-touch items-center rounded-control border border-border bg-surface-muted px-3 text-base tabular-nums"
          >
            {conversion.error ??
              (hasInvalidInput ? "请输入有效数字" : conversion.result ?? "—")}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <UnitSelect
          label="从"
          units={selectedGroup?.units ?? []}
          value={fromUnitId}
          onChange={setFromUnitId}
        />
        <UnitSelect
          label="转换为"
          units={selectedGroup?.units ?? []}
          value={toUnitId}
          onChange={setToUnitId}
        />
      </div>
      <CopyButton text={conversion.result === undefined ? "" : String(conversion.result)} />
    </Card>
  );
}

type UnitSelectProps = {
  label: string;
  units: readonly UnitDefinition[];
  value: string;
  onChange: (value: string) => void;
};

function UnitSelect({ label, units, value, onChange }: UnitSelectProps) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      <Select
        aria-label={`${label}单位`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
