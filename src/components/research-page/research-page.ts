import { BaseComponent } from '../../core/base-component.ts';
import '../site-header/site-header.ts';
import template from './research-page.html?raw';
import style from './research-page.css?raw';
import researchData from '../../generated/research.json' with { type: 'json' };

type ResearchItemKind = 'pdf' | 'article';
type ResearchCategory = 'publication' | 'preprint' | 'planned';

interface ResearchItem {
  title: string;
  kind: ResearchItemKind;
  category: ResearchCategory;
  /**
   * For kind 'pdf': a filename under public/research/<category folder>/
   * (e.g. 'my-paper.pdf' for a 'preprint' item lives at
   * public/research/preprints/my-paper.pdf). For kind 'article': a full
   * external URL. Omit entirely for a citation with nothing to link to.
   */
  href?: string;
  venue?: string;
  date?: string;
  summary?: string;
}

// Publications pulled from publications.bib and ORCID, merged and deduped
// at build time by `npm run content:generate` (see scripts/generate-content.ts)
// — this is the same shape as `ResearchItem` above.
const PUBLICATION_ITEMS: ResearchItem[] = researchData as ResearchItem[];

const CATEGORY_ORDER: {
  key: ResearchCategory;
  label: string;
  folder: string;
}[] = [
  { key: 'publication', label: 'Publications', folder: 'publications' },
  { key: 'preprint', label: 'Preprints', folder: 'preprints' },
  { key: 'planned', label: 'Planned Work', folder: 'planned' },
];

const CATEGORY_FOLDER: Record<ResearchCategory, string> =
  Object.fromEntries(
    CATEGORY_ORDER.map(({ key, folder }) => [key, folder])
  ) as Record<ResearchCategory, string>;

// ── EDIT: add your papers/articles here. `kind: 'pdf'` expects a filename
// dropped into the matching public/research/<publications|preprints|planned>/
// folder for its `category` (served at BASE_URL +
// 'research/<category>/<file>' on GitHub Pages); `kind: 'article'` expects
// a full external URL. `category` also controls which section
// (Publications / Preprints / Works in Progress) an entry lands in.
// Publications are normally pulled live from publications.bib and ORCID
// (below) — only add a 'publication' entry here to feature something
// specific alongside them.
const RESEARCH_ITEMS: ResearchItem[] = [
  {
    title: 'Preface',
    kind: 'pdf',
    category: 'planned',
    href: 'preface.pdf',
    venue: 'PhD thesis — Principle-Based Design (draft)',
    date: '2026',
    summary:
      'Draft preface introducing Principle-Based Design: translating H.T. Odum’s systems-ecology concept of Feedback Design into Rhino3D/Grasshopper, via the Noria water wheel as a case study.',
  },
];

const ORCID_ID = '0009-0004-1292-5980';
const ORCID_PROFILE_URL = `https://orcid.org/${ORCID_ID}`;
const SCHOLAR_URL =
  'https://scholar.google.com/citations?hl=en&user=Ltw1_fYAAAAJ&view_op=list_works&sortby=pubdate&inst=7289110936595769722';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── rendering ───────────────────────────────────────────────────────────

function resolveHref(item: ResearchItem): string | undefined {
  if (!item.href) return undefined;
  if (item.kind === 'article') return item.href;
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}research/${CATEGORY_FOLDER[item.category]}/${encodeURIComponent(item.href)}`;
}

function renderItem(item: ResearchItem): string {
  const meta = [item.venue, item.date].filter(Boolean).join(' · ');
  const href = resolveHref(item);
  const inner = `
    <div class="research-item__head">
      <span class="research-item__title">${escapeHtml(item.title)}</span>
      ${href ? `<span class="research-item__kind">${item.kind === 'pdf' ? 'PDF' : 'Article'}</span>` : ''}
    </div>
    ${meta ? `<div class="research-item__meta">${escapeHtml(meta)}</div>` : ''}
    ${item.summary ? `<p class="research-item__summary">${escapeHtml(item.summary)}</p>` : ''}
  `;

  if (!href) {
    return `<li><div class="research-item research-item--static">${inner}</div></li>`;
  }

  return `
    <li>
      <a class="research-item" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
        ${inner}
      </a>
    </li>
  `;
}

function renderSection(label: string, items: ResearchItem[]): string {
  return `
    <section class="research__section">
      <h2 class="research__section-title">${escapeHtml(label)}</h2>
      <ul class="research__list">
        ${items.map(renderItem).join('')}
      </ul>
    </section>
  `;
}

function renderPublicationsSection(label: string, items: ResearchItem[]): string {
  const links = `
    <p class="research__section-note">
      Listings:
      <a href="${SCHOLAR_URL}" target="_blank" rel="noopener noreferrer">Google Scholar</a>
      ·
      <a href="${ORCID_PROFILE_URL}" target="_blank" rel="noopener noreferrer">ORCID</a>
    </p>
  `;

  const body =
    items.length > 0
      ? `<ul class="research__list">${items.map(renderItem).join('')}</ul>`
      : `<p class="research__empty">Nothing listed yet — see the links above.</p>`;

  return `
    <section class="research__section">
      ${links}
      <h2 class="research__section-title">${escapeHtml(label)}</h2>
      ${body}
    </section>
  `;
}

export class ResearchPageComponent extends BaseComponent {
  static tagName = 'research-page';

  constructor() {
    super(template, style);
  }

  init() {
    const container = this.querySelector('#research-sections');
    if (!container) return;

    container.innerHTML = CATEGORY_ORDER.map(({ key, label }) => {
      if (key === 'publication') {
        const manualItems = RESEARCH_ITEMS.filter((item) => item.category === 'publication');
        return renderPublicationsSection(label, [...manualItems, ...PUBLICATION_ITEMS]);
      }
      const items = RESEARCH_ITEMS.filter((item) => item.category === key);
      return items.length > 0 ? renderSection(label, items) : '';
    }).join('');
  }
}

if (!customElements.get(ResearchPageComponent.tagName)) {
  customElements.define(ResearchPageComponent.tagName, ResearchPageComponent);
}
