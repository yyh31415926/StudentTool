import type { ToolDefinition } from "@/types/tools";
import { archiveTool } from "./archive";
import { pythonPackageTool } from "./python-package";
import { baseConvertTool } from "./base-convert";
import { base64Tool } from "./base64";
import { charCountTool } from "./char-count";
import { imageOcrTool } from "./image-ocr";
import { jsonFormatTool } from "./json-format";
import { qrcodeTool } from "./qrcode";
import { unitConvertTool } from "./unit-convert";
import { urlEncodeTool } from "./url-encode";

export const toolDefinitions = [
  charCountTool,
  unitConvertTool,
  baseConvertTool,
  jsonFormatTool,
  base64Tool,
  urlEncodeTool,
  qrcodeTool,
  imageOcrTool,
  archiveTool,
  pythonPackageTool,
] satisfies readonly ToolDefinition[];
