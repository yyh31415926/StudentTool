export type TaskReceipt = { version: 1; id: string; token: string };
export function parseReceipt(text: string): TaskReceipt {
  if (text.length > 1024) throw new Error("任务凭证文件过大。");
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object") throw new Error("任务凭证无效。");
  const receipt = value as Partial<TaskReceipt>;
  if (receipt.version !== 1 || typeof receipt.id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(receipt.id) || typeof receipt.token !== "string" || !/^[a-f0-9]{64}$/.test(receipt.token)) throw new Error("任务凭证无效。");
  return { version: 1, id: receipt.id, token: receipt.token };
}
