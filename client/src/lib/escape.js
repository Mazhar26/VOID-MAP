// ─── HTML Escaper ────────────────────────────────────────────────────────────
// Single copy — was duplicated 4× across the codebase.

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
