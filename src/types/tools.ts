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
  /** A short description suitable for cards and search results. */
  summary?: string;
  /** Search and future grouping labels. */
  tags?: readonly string[];
  /** Additional search terms beyond the display name. */
  keywords?: readonly string[];
  /** Pinyin initials used by the search layer when available. */
  pinyin?: string;
  /** Stable display order, when a product-defined order is needed. */
  order?: number;
  /** A concise usage tip shown below the tool interaction. */
  tip?: string;
  /** Optional copy for empty input states. */
  emptyHint?: string;
  /** Optional fallback copy for errors thrown by run. */
  errorHint?: string;
};
