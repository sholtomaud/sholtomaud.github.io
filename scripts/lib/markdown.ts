export type PerspectiveKind = 'ai' | 'human';

export interface Perspective {
  author: string;
  date: string;
  kind: PerspectiveKind;
  paragraphs: string[];
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Splits plain prose (no frontmatter) into blank-line-separated paragraphs.
 * For content with no metadata fields, e.g. content/about/autobio.md.
 */
export function parseParagraphs(raw: string): string[] {
  return splitParagraphs(raw);
}

/**
 * Parses the minimal frontmatter format used for perspective content:
 * a flat `key: value` block delimited by `---` lines, followed by a body
 * of blank-line-separated paragraphs. Deliberately not a general-purpose
 * markdown/YAML parser — just enough for this one content shape.
 */
export function parseFrontmatterMarkdown(raw: string): Perspective {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error('Markdown file is missing its --- frontmatter block');
  }

  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    fields[key] = value;
  }

  if (!fields.author || !fields.date || !fields.kind) {
    throw new Error('Frontmatter must include "author", "date", and "kind" fields');
  }
  if (fields.kind !== 'ai' && fields.kind !== 'human') {
    throw new Error(`Frontmatter "kind" must be "ai" or "human", got "${fields.kind}"`);
  }

  const paragraphs = splitParagraphs(raw.slice(match[0].length));
  return { author: fields.author, date: fields.date, kind: fields.kind, paragraphs };
}
