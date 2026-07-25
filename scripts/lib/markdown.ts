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
 * The shared paragraph splitter behind the frontmatter parsers; also the
 * fallback `parseAboutBio` uses for a frontmatter-less bio.
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
/**
 * Parses a flat `key: value` frontmatter block (colon-delimited, delimited by
 * `---`) and returns its fields plus the raw body after it. The colon-style
 * counterpart to manifest.ts's INI `parseIniFrontmatter`; shared by the
 * perspective and about-bio parsers below.
 */
export function parseColonFrontmatter(raw: string): { fields: Record<string, string>; body: string } {
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

  return { fields, body: raw.slice(match[0].length) };
}

export function parseFrontmatterMarkdown(raw: string): Perspective {
  const { fields, body } = parseColonFrontmatter(raw);

  if (!fields.author || !fields.date || !fields.kind) {
    throw new Error('Frontmatter must include "author", "date", and "kind" fields');
  }
  if (fields.kind !== 'ai' && fields.kind !== 'human') {
    throw new Error(`Frontmatter "kind" must be "ai" or "human", got "${fields.kind}"`);
  }

  return {
    author: fields.author,
    date: fields.date,
    kind: fields.kind,
    paragraphs: splitParagraphs(body),
  };
}

export interface AboutBio {
  author?: string;
  date?: string;
  paragraphs: string[];
}

/**
 * Parses content/about/autobio.md. Frontmatter is optional here — with an
 * `author: / date:` block it's stripped and surfaced as byline metadata;
 * without one, the whole file is treated as plain prose (author/date stay
 * undefined and the page renders no byline).
 */
export function parseAboutBio(raw: string): AboutBio {
  if (!FRONTMATTER_RE.test(raw)) {
    return { paragraphs: splitParagraphs(raw) };
  }
  const { fields, body } = parseColonFrontmatter(raw);
  return {
    author: fields.author || undefined,
    date: fields.date || undefined,
    paragraphs: splitParagraphs(body),
  };
}
