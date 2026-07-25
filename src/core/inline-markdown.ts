/**
 * HTML-escape a string for safe interpolation into markup.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// [text](https://…) — http/https only, so a summary can't smuggle in a
// `javascript:` (or other scheme) URL.
const INLINE_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/**
 * Minimal, safe inline markdown for content summaries: HTML-escapes the whole
 * string first, then turns `[text](url)` into an external link (http/https
 * only, opens in a new tab). Because escaping happens before linkifying, both
 * the link text and the URL are already neutralised — there's no injection
 * surface. Anything that isn't a well-formed http(s) link is left as escaped
 * text. Deliberately not a general markdown parser — just links in prose.
 */
export function renderInlineMarkdown(raw: string): string {
  return escapeHtml(raw).replace(
    INLINE_LINK_RE,
    (_match, text, url) =>
      `<a class="inline-link" href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
  );
}
