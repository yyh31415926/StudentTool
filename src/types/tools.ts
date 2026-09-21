export type ToolCategory = "convert" | "text" | "dev";

export type ToolRun = (input: unknown) => unknown;

export type ToolDefinition = {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  template: string;
  exampleInput: string;
  run: ToolRun;
};
