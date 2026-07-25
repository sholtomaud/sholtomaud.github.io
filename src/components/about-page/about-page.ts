import { Router } from '../../core/router/router.ts';
import { BaseComponent } from '../../core/base-component.ts';
import '../site-header/site-header.ts';
import template from './about-page.html?raw';
import style from './about-page.css?raw';
import aboutBio from '../../generated/about.json' with { type: 'json' };
import perspectivesData from '../../generated/perspectives.json' with { type: 'json' };

type PerspectiveKind = 'ai' | 'human';

interface AboutBio {
  author?: string;
  date?: string;
  paragraphs: string[];
}

interface Perspective {
  author: string;
  date: string;
  kind: PerspectiveKind;
  paragraphs: string[];
}

const GROUP_ORDER: { key: PerspectiveKind; label: string }[] = [
  { key: 'human', label: 'Human' },
  { key: 'ai', label: 'AI' },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPerspectiveGroups(perspectives: Record<string, Perspective>): string {
  const entries = Object.entries(perspectives);

  return GROUP_ORDER.map(({ key, label }) => {
    const items = entries
      .filter(([, perspective]) => perspective.kind === key)
      .sort((a, b) => b[1].date.localeCompare(a[1].date));
    if (items.length === 0) return '';

    const links = items
      .map(
        ([slug, perspective]) =>
          `<li><a href="/about/${encodeURIComponent(slug)}" data-nav>${escapeHtml(perspective.author)}</a></li>`
      )
      .join('');

    return `
      <div class="perspectives__group">
        <h3 class="perspectives__group-title">${escapeHtml(label)}:</h3>
        <ul class="perspectives__list">${links}</ul>
      </div>
    `;
  }).join('');
}

export class AboutPageComponent extends BaseComponent {
  static tagName = 'about-page';

  constructor() {
    super(template, style);
  }

  init() {
    const groups = this.querySelector('#perspectives-groups');
    if (groups) {
      groups.innerHTML = renderPerspectiveGroups(
        perspectivesData as Record<string, Perspective>
      );
    }

    const intro = this.querySelector('#about-intro');
    if (intro) {
      const bio = aboutBio as AboutBio;
      bio.paragraphs.forEach((text) => {
        const p = document.createElement('p');
        p.className = 'page__intro';
        p.textContent = text;
        intro.appendChild(p);
      });

      // Byline from the bio's frontmatter (author, optional year). Rendered
      // only when an author is present — a frontmatter-less bio shows none.
      if (bio.author) {
        const year = bio.date?.match(/\d{4}/)?.[0];
        const byline = document.createElement('p');
        byline.className = 'about-bio__byline';
        byline.textContent = year ? `— ${bio.author}, ${year}` : `— ${bio.author}`;
        intro.appendChild(byline);
      }
    }

    // Runs after the dynamic content above so it also wires up the
    // freshly-rendered perspective links, not just the static ones.
    this.querySelectorAll<HTMLAnchorElement>('a[data-nav]').forEach((link) => {
      const href = link.getAttribute('href');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (href) Router.getInstance().navigate(href);
      });
    });
  }
}

if (!customElements.get(AboutPageComponent.tagName)) {
  customElements.define(AboutPageComponent.tagName, AboutPageComponent);
}
