const XSS_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

export function escapeHTML(input: string): string {
  return `${input}`.replace(/[&<>"'/]/g, (ch) => XSS_MAP[ch]);
}