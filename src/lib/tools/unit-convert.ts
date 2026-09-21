export type UnitDefinition = {
  id: string;
  name: string;
  factor: number;
};

export type UnitGroup = {
  id: string;
  name: string;
  units: readonly UnitDefinition[];
};

export type UnitConversionInput = {
  value: number;
  fromUnitId: string;
  toUnitId: string;
};

export const unitConvertGroups: readonly UnitGroup[] = [
  {
    id: "length",
    name: "长度",
    units: [
      { id: "mm", name: "毫米 (mm)", factor: 0.001 },
      { id: "cm", name: "厘米 (cm)", factor: 0.01 },
      { id: "m", name: "米 (m)", factor: 1 },
      { id: "km", name: "千米 (km)", factor: 1000 },
    ],
  },
  {
    id: "mass",
    name: "质量",
    units: [
      { id: "mg", name: "毫克 (mg)", factor: 0.000001 },
      { id: "g", name: "克 (g)", factor: 0.001 },
      { id: "kg", name: "千克 (kg)", factor: 1 },
    ],
  },
] as const;

function findUnit(unitId: string) {
  for (const group of unitConvertGroups) {
    const unit = group.units.find((candidate) => candidate.id === unitId);

    if (unit) {
      return { group, unit };
    }
  }

  return undefined;
}

export function convertUnit(
  value: number,
  fromUnitId: string,
  toUnitId: string,
): number {
  if (!Number.isFinite(value)) {
    throw new TypeError("换算输入必须是有限数字。");
  }

  const from = findUnit(fromUnitId);
  const to = findUnit(toUnitId);

  if (!from || !to) {
    throw new RangeError("未找到指定单位。");
  }

  if (from.group.id !== to.group.id) {
    throw new RangeError("不能在不同单位类型之间换算。");
  }

  return (value * from.unit.factor) / to.unit.factor;
}

export function runUnitConversion(input: unknown): number {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("单位换算需要结构化输入。");
  }

  const candidate = input as Partial<UnitConversionInput>;

  if (
    typeof candidate.value !== "number" ||
    typeof candidate.fromUnitId !== "string" ||
    typeof candidate.toUnitId !== "string"
  ) {
    throw new TypeError("单位换算输入格式无效。");
  }

  return convertUnit(
    candidate.value,
    candidate.fromUnitId,
    candidate.toUnitId,
  );
}
