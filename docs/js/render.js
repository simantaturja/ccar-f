// Safe rich-text rendering: escape everything, then re-enable a small tag whitelist
// (<code>, <em>, <span class="ed-note">) so literal XML like <examples> stays visible as text.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

const WHITELIST = [
  [/&lt;code&gt;([\s\S]*?)&lt;\/code&gt;/g, '<code>$1</code>'],
  [/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/g, '<em>$1</em>'],
  [/&lt;span class=&quot;ed-note&quot;&gt;([\s\S]*?)&lt;\/span&gt;/g, '<span class="ed-note">$1</span>'],
];

export function richText(s) {
  let out = escapeHtml(s);
  for (const [re, rep] of WHITELIST) out = out.replace(re, rep);
  // Tidy " <code>x</code> ," spacing artefacts from the source.
  out = out.replace(/<\/code> ([,.?;:])/g, '</code>$1');
  return out.replace(/\n/g, '<br>');
}
