import type { AppState } from "./types";
import { dayKey } from "./dates";

/**
 * Plain-text exports. A client demoing the app needs the numbers out of it in
 * something a spreadsheet understands, not only a state dump.
 */

function escapeCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sheet(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function activityCsv(state: AppState): string {
  const days = Object.keys(state.activity)
    .sort()
    .map((day) => [day, state.activity[day], state.focusByDay[day] ?? 0]);
  return sheet([["date", "quests_completed", "focus_minutes"], ...days]);
}

export function questsCsv(state: AppState): string {
  return sheet([
    ["id", "title", "category", "priority", "status", "due", "tags", "created", "completed_at"],
    ...state.tasks.map((task) => [
      task.id,
      task.text,
      task.category,
      task.priority,
      task.completed ? "done" : task.status,
      task.due ?? "",
      task.tags.join(" "),
      new Date(task.created).toISOString(),
      task.completedAt ? new Date(task.completedAt).toISOString() : "",
    ]),
  ]);
}

export function downloadText(filename: string, mime: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function stamp(): string {
  return dayKey();
}
