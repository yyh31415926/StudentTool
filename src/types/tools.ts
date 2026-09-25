export type ToolCategory = "convert" | "text" | "dev";

export type ToolRun = (input: unknown) => unknown;

/**
 * One operation of a tool that does the same thing in several ways
 * (for example JSON: format / minify / validate).
 *
 * Declared by the definition, rendered by the template. A tool without
 * `actions` keeps the single-input shape `run(text)`.
 */
export type ToolAction = {
  id: string;
  label: string;
};

export type ToolFaq = {
  question: string;
  answer: string;
};

export type ToolDefinition = {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  /**
   * The interface shape this tool uses. Resolved through the template registry.
   * Optional when `customUI` is provided: a tool with a unique interaction uses
   * a dedicated custom component instead of one of the shared templates.
   */
  template?: string;
  /**
   * Optional key of a dedicated custom component (resolved through the custom
   * registry). Used for tools whose interaction does not fit any shared
   * template, without growing the template count past its cap.
   */
  customUI?: string;
  /**
   * Optional operations of a tool. When present, multi-action templates call
   * `run({ text, action })` instead of `run(text)`, where `action` is one of
   * the declared `ToolAction.id` values.
   */
  actions?: readonly ToolAction[];
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
  seoFaq?: readonly ToolFaq[];
};
