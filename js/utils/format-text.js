// Converts plain textarea-authored text (real \n line breaks, no HTML)
// into safe, properly-broken HTML: escapes it first, then treats a
// blank line as a paragraph break and a single line break as <br>.
export function formatPlainText(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.trim().replace(/\n/g, '<br>')}</p>`)
    .filter((p) => p !== '<p></p>')
    .join('');
}

