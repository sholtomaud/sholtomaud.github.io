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

/**
 * Parses a project Manifest.md: an INI-flavoured frontmatter block (flat
 * `key = value` lines, plus zero or more `[artifact.N]` sections — each
 * becomes one entry in `artifacts`), followed by a plain-prose summary
 * body. INI instead of nested YAML: same "list of records" shape your
 * artifacts need, without indentation-sensitive parsing rules or a YAML
 * dependency — just section headers and flat key/value lines.
 */
export function parseWorkManifest(raw: string): WorkManifest {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error('Manifest is missing its --- frontmatter block');
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

  const summary = splitParagraphs(raw.slice(match[0].length)).join(' ');
  return { title: fields.title, date: fields.date, artifacts, summary };
}
