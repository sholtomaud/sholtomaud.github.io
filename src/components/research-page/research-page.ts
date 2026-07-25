import { BaseComponent } from '../../core/base-component.ts';
import '../site-header/site-header.ts';
import template from './research-page.html?raw';
import style from './research-page.css?raw';
import researchData from '../../generated/research.json' with { type: 'json' };
import { escapeHtml, renderInlineMarkdown } from '../../core/inline-markdown.ts';

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

// The full research list, built at build time by `npm run content:generate`
// (see scripts/generate-content.ts): published items from publications.bib +
// ORCID (categories 'publication'/'preprint') plus authored planned items
// from content/research/planned/*.md (category 'planned'). Same shape as
// `ResearchItem` above. Sections below just filter this by `category`.
const RESEARCH_ITEMS: ResearchItem[] = researchData as ResearchItem[];

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

const ORCID_ID = '0009-0004-1292-5980';
const ORCID_PROFILE_URL = `https://orcid.org/${ORCID_ID}`;
const SCHOLAR_URL =
  'https://scholar.google.com/citations?hl=en&user=Ltw1_fYAAAAJ&view_op=list_works&sortby=pubdate&inst=7289110936595769722';

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
    ${item.summary ? `<p class="research-item__summary">${renderInlineMarkdown(item.summary)}</p>` : ''}
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
      const items = RESEARCH_ITEMS.filter((item) => item.category === key);
      // Publications always renders (it carries the Scholar/ORCID links and
      // its own empty-state); other sections appear only when non-empty.
      if (key === 'publication') {
        return renderPublicationsSection(label, items);
      }
      return items.length > 0 ? renderSection(label, items) : '';
    }).join('');
  }
}

if (!customElements.get(ResearchPageComponent.tagName)) {
  customElements.define(ResearchPageComponent.tagName, ResearchPageComponent);
}
