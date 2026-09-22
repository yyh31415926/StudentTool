import type { ComponentType } from "react";
import { BaseConverterTemplate } from "./BaseConverterTemplate";
import { ConverterTemplate } from "./ConverterTemplate";
import { CounterTemplate } from "./CounterTemplate";
import { SplitPreviewTemplate } from "./SplitPreviewTemplate";
import { TextTransformTemplate } from "./TextTransformTemplate";
import { baseDefinitions } from "@/lib/tools/base-convert";
import { unitConvertGroups } from "@/lib/tools/unit-convert";

export type ToolTemplateProps = {
  toolId: string;
  exampleInput: string;
  emptyHint?: string;
  errorHint?: string;
};

type ToolTemplateComponent = ComponentType<ToolTemplateProps>;

function CounterTemplateAdapter({ exampleInput }: ToolTemplateProps) {
  return <CounterTemplate exampleInput={exampleInput} />;
}

function ConverterTemplateAdapter() {
  return <ConverterTemplate unitGroups={unitConvertGroups} />;
}

function BaseConverterTemplateAdapter() {
  return <BaseConverterTemplate bases={baseDefinitions} />;
}

/**
 * The single source of truth for mapping definition template ids to UI.
 * Routes resolve a component from here and never need to know a tool id.
 */
export const templateRegistry: Readonly<
  Partial<Record<string, ToolTemplateComponent>>
> = {
  counter: CounterTemplateAdapter,
  converter: ConverterTemplateAdapter,
  "base-converter": BaseConverterTemplateAdapter,
  "text-transform": TextTransformTemplate,
  "split-preview": SplitPreviewTemplate,
};

export function getTemplateComponent(
  templateId: string,
): ToolTemplateComponent | undefined {
  return templateRegistry[templateId];
}
