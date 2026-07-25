import { splitParagraphs } from './markdown.ts';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const SECTION_RE = /^\[(.+)\]$/;

export interface WorkArtifact {
  kind: string;
  label: string;
  url: string;
}

export interface WorkManifest {
  title: string;
  date?: string;
  artifacts: WorkArtifact[];
  summary: string;
}

export interface IniFrontmatter {
  /** Top-level `key = value` lines (before any `[section]` header). */
  fields: Record<string, string>;
  /** `[name]` sections, each a flat map of its own `key = value` lines. */
  sections: Record<string, Record<string, string>>;
  /** Raw markdown body after the closing `---` (unsplit). */
  body: string;
}

/**
 * Parses an INI-flavoured frontmatter block — flat `key = value` lines, plus
 * zero or more `[section]` blocks — delimited by `---`, followed by a body.
 * INI instead of nested YAML: the same "list of records" shape our content
 * needs, without indentation-sensitive rules or a YAML dependency. Shared by
 * work manifests (which use `[artifact.N]` sections) and planned-research
 * items (which use only the flat fields).
 */
export function parseIniFrontmatter(raw: string): IniFrontmatter {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error('Content is missing its --- frontmatter block');
  }

  const fields: Record<string, string> = {};
  const sections: Record<string, Record<string, string>> = {};
  let currentSection: string | null = null;

  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sections[currentSection] = {};
      continue;
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();

    if (currentSection) {
      sections[currentSection][key] = value;
    } else {
      fields[key] = value;
    }
  }

  return { fields, sections, body: raw.slice(match[0].length) };
}

/**
 * Parses a project file (content/projects/<slug>.md): INI frontmatter whose
 * `[artifact.N]` sections each become one entry in `artifacts`, followed by a
 * plain-prose summary.
 */
export function parseWorkManifest(raw: string): WorkManifest {
  const { fields, sections, body } = parseIniFrontmatter(raw);

  if (!fields.title) {
    throw new Error('Manifest must include a "title" field');
  }

  const artifacts: WorkArtifact[] = Object.entries(sections)
    .filter(([name]) => name.startsWith('artifact'))
    .map(([name, entry]) => {
      if (!entry.label || !entry.url) {
        throw new Error(`Manifest section [${name}] must include "label" and "url"`);
      }
      return { kind: entry.kind ?? 'link', label: entry.label, url: entry.url };
    });

  const summary = splitParagraphs(body).join(' ');
  return { title: fields.title, date: fields.date, artifacts, summary };
}
