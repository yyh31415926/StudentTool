import type { ComponentType } from "react";
import { ImageOcrTool } from "./image-ocr/ImageOcrTool";
import { QRCodeTool } from "./qrcode/QRCodeTool";

/**
 * 自定义工具界面的单一映射点。
 *
 * 与模板注册表（templates/registry.tsx）分工：模板承载"多个工具共用的界面形状"，
 * 自定义组件承载"交互独特、无法复用模板"的工具（见 AGENT_RULES §4.5：模板总数
 * ≤ 5，只有这一个工具需要的界面走自定义组件）。工具页据此解析组件，无需知道工具 id。
 */
export type ToolCustomProps = {
  toolId: string;
  exampleInput: string;
  emptyHint?: string;
  errorHint?: string;
};

type ToolCustomComponent = ComponentType<ToolCustomProps>;

export const customToolRegistry: Readonly<
  Partial<Record<string, ToolCustomComponent>>
> = {
  qrcode: QRCodeTool,
  "image-ocr": ImageOcrTool,
};

export function getCustomToolComponent(
  customId: string,
): ToolCustomComponent | undefined {
  return customToolRegistry[customId];
}
