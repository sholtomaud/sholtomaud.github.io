import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseIniFrontmatter } from './manifest.ts';
import { splitParagraphs } from './markdown.ts';

export type ResearchItemKind = 'pdf' | 'article';
export type ResearchCategory = 'publication' | 'preprint' | 'planned';

export interface ResearchItem {
  title: string;
  kind: ResearchItemKind;
  category: ResearchCategory;
  href?: string;
  venue?: string;
  date?: string;
  summary?: string;
}

const ORCID_ID = '0009-0004-1292-5980';
// Build inputs live under content/ (compiled, never served). Downloadable
// PDFs stay under public/research/<category>/ (served as-is by Vite).
const BIB_PATH = 'content/research/publications.bib';
const PLANNED_DIR = 'content/research/planned';

// ── EDIT: for a publications.bib entry whose PDF has been dropped into
// public/research/publications/, map its BibTeX citekey to that filename
// here so the list links to the local copy instead of the DOI/URL.
const LOCAL_PDF_OVERRIDES: Record<string, string> = {
  'mo_Heuristic_2015f':
    'Mo and Maud - 2015 - Heuristic Systems Engineering of a Web Based Service System.pdf',
};

// ── publications.bib parsing ───────────────────────────────────────────
// A small hand-rolled parser for the one BibTeX shape Zotero exports here:
// `@type{key, field = {value}, ...}`, values brace-delimited (with nested
// braces for case-protection, e.g. `{{DirectScience}}`). Not a general
// BibTeX parser — just enough for this file.

export interface BibEntry {
  key: string;
  fields: Record<string, string>;
}

export function parseBibFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldStart = /(\w+)\s*=\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = fieldStart.exec(body))) {
    const key = match[1].toLowerCase();
    let depth = 1;
    let i = fieldStart.lastIndex;
    const start = i;
    while (i < body.length && depth > 0) {
      if (body[i] === '{') depth++;
      else if (body[i] === '}') depth--;
      i++;
    }
    fields[key] = body.slice(start, i - 1);
    fieldStart.lastIndex = i;
  }
  return fields;
}

export function parseBibliography(raw: string): BibEntry[] {
  return raw
    .split(/\n(?=@\w+\{)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const header = chunk.match(/^@\w+\{([^,]+),/);
      if (!header) return null;
      return { key: header[1].trim(), fields: parseBibFields(chunk) };
    })
    .filter((entry): entry is BibEntry => entry !== null);
}

export function cleanBibText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[{}]/g, '').replace(/\\&/g, '&').trim();
  return cleaned || undefined;
}

export function bibEntryToResearchItem(entry: BibEntry): ResearchItem {
  const title = cleanBibText(entry.fields.title) ?? entry.key;
  const venue = cleanBibText(entry.fields.journaltitle ?? entry.fields.booktitle);
  const date = entry.fields.date?.match(/^\d{4}/)?.[0];
  const doi = cleanBibText(entry.fields.doi);
  const url = cleanBibText(entry.fields.url);
  const localFile = LOCAL_PDF_OVERRIDES[entry.key];

  if (localFile) {
    return { title, kind: 'pdf', category: 'publication', href: localFile, venue, date };
  }
  if (doi) {
    return {
      title,
      kind: 'article',
      category: 'publication',
      href: `https://doi.org/${doi}`,
      venue,
      date,
    };
  }
  if (url) {
    return { title, kind: 'article', category: 'publication', href: url, venue, date };
  }
  return { title, kind: 'article', category: 'publication', venue, date };
}

export async function loadBibPublications(): Promise<ResearchItem[]> {
  let raw: string;
  try {
    raw = await readFile(BIB_PATH, 'utf-8');
  } catch {
    console.log(`[generate-content] No ${BIB_PATH} found — skipping bib publications.`);
    return [];
  }
  return parseBibliography(raw)
    .map(bibEntryToResearchItem)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

// ── planned research (authored markdown) ───────────────────────────────
// Planned/in-progress items are authored as INI-frontmatter markdown under
// content/research/planned/, same flat `key = value` shape as a work
// manifest (minus the [artifact.N] sections). `kind = pdf` links a file
// served from public/research/planned/<href>; `kind = article` links a URL;
// omit both for a citation with nothing to link to. Body = summary.

export function parsePlannedResearch(raw: string): ResearchItem {
  const { fields, body } = parseIniFrontmatter(raw);
  if (!fields.title) {
    throw new Error('Planned research item must include a "title" field');
  }
  const summary = splitParagraphs(body).join(' ');
  return {
    title: fields.title,
    kind: fields.kind === 'pdf' ? 'pdf' : 'article',
    category: 'planned',
    href: fields.href || undefined,
    venue: fields.venue || undefined,
    date: fields.date || undefined,
    summary: summary || undefined,
  };
}

export async function loadPlannedResearch(): Promise<ResearchItem[]> {
  let files: string[];
  try {
    files = (await readdir(PLANNED_DIR)).filter((file) => file.endsWith('.md'));
  } catch {
    return [];
  }
  const items = await Promise.all(
    files.map(async (file) =>
      parsePlannedResearch(await readFile(path.join(PLANNED_DIR, file), 'utf-8'))
    )
  );
  return items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

// ── ORCID (supplementary — catches anything not yet in publications.bib)
// Minimal shape of the bits of ORCID's public works API we use.
// Full schema: https://info.orcid.org/documentation/api-tutorials/
export interface OrcidExternalId {
  'external-id-type'?: string;
  'external-id-value'?: string;
  'external-id-url'?: { value?: string } | null;
}

export interface OrcidWorkSummary {
  title?: { title?: { value?: string } | null } | null;
  'publication-date'?: { year?: { value?: string } | null } | null;
  'journal-title'?: { value?: string } | null;
  url?: { value?: string } | null;
  'external-ids'?: { 'external-id'?: OrcidExternalId[] } | null;
}

interface OrcidWorksResponse {
  group?: { 'work-summary'?: OrcidWorkSummary[] }[];
}

export function orcidWorkToResearchItem(summary: OrcidWorkSummary): ResearchItem {
  const doi = summary['external-ids']?.['external-id']?.find(
    (id) => id['external-id-type'] === 'doi'
  );
  // ORCID's external-id-url is frequently null even when a DOI value is
  // present (e.g. Scopus-imported works) — build the doi.org link ourselves
  // rather than falling back to a possibly-paywalled publisher/Scopus URL.
  // This also keeps hrefs comparable to publications.bib's doi.org links,
  // which dedupeAgainst() relies on.
  const href = doi?.['external-id-value']
    ? `https://doi.org/${doi['external-id-value']}`
    : (doi?.['external-id-url']?.value ?? summary.url?.value ?? undefined);

  return {
    title: summary.title?.title?.value ?? 'Untitled',
    kind: 'article',
    category: 'publication',
    href,
    venue: summary['journal-title']?.value,
    date: summary['publication-date']?.year?.value,
  };
}

export async function fetchOrcidPublications(): Promise<ResearchItem[]> {
  try {
    const response = await fetch(`https://pub.orcid.org/v3.0/${ORCID_ID}/works`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`ORCID request failed: ${response.status}`);
    }
    const data: OrcidWorksResponse = await response.json();

    return (data.group ?? [])
      .map((group) => group['work-summary']?.[0])
      .filter((summary): summary is OrcidWorkSummary => !!summary)
      .map(orcidWorkToResearchItem)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  } catch (error) {
    console.warn('[generate-content] Failed to fetch ORCID publications:', error);
    return [];
  }
}

export function dedupeAgainst(existing: ResearchItem[], incoming: ResearchItem[]): ResearchItem[] {
  const existingHrefs = new Set(existing.map((item) => item.href).filter(Boolean));
  return incoming.filter((item) => !item.href || !existingHrefs.has(item.href));
}

/**
 * Merges publications.bib entries with ORCID works, deduped against the
 * bib list (ORCID is a supplementary catch-all for anything not yet in
 * publications.bib), ready for a component to render directly.
 */
export async function generateResearchPublications(): Promise<ResearchItem[]> {
  const [bibItems, orcidItems] = await Promise.all([
    loadBibPublications(),
    fetchOrcidPublications(),
  ]);
  return [...bibItems, ...dedupeAgainst(bibItems, orcidItems)];
}

/**
 * The full research list rendered by research-page.ts: published items
 * (publications.bib + ORCID, categories `publication`/`preprint`) followed
 * by authored planned items (category `planned`).
 */
export async function generateResearch(): Promise<ResearchItem[]> {
  const [published, planned] = await Promise.all([
    generateResearchPublications(),
    loadPlannedResearch(),
  ]);
  return [...published, ...planned];
}
