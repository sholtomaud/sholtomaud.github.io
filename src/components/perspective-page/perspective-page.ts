import { Router } from '../../core/router/router.ts';
import { BaseComponent } from '../../core/base-component.ts';
import '../site-header/site-header.ts';
import template from './perspective-page.html?raw';
import style from './perspective-page.css?raw';
import perspectivesData from '../../generated/perspectives.json' with { type: 'json' };

interface Perspective {
  author: string;
  date: string;
  paragraphs: string[];
}

// ── EDIT: add another perspective by dropping content/perspectives/<slug>.md
// (see existing files for the format). about-page.ts's Perspectives list
// renders straight from the same generated JSON, so no HTML edit is
// needed. `npm run content:generate` (runs automatically before dev/build)
// turns the markdown into this generated JSON.
const PERSPECTIVES: Record<string, Perspective> = perspectivesData;

export class PerspectivePageComponent extends BaseComponent {
  static tagName = 'perspective-page';
  params?: Record<string, string>;

  constructor() {
    super(template, style);
  }

  init() {
    this.querySelectorAll<HTMLAnchorElement>('a[data-nav]').forEach(
      (link) => {
        const href = link.getAttribute('href');
        link.addEventListener('click', (e) => {
          e.preventDefault();
          if (href) Router.getInstance().navigate(href);
        });
      }
    );

    const content = this.querySelector('#perspective-content');
    if (!content) return;

    const slug = this.params?.slug;
    const perspective = slug ? PERSPECTIVES[slug] : undefined;

    if (!perspective) {
      const missing = document.createElement('p');
      missing.className = 'perspective__missing';
      missing.textContent = "There's no perspective here yet.";
      content.appendChild(missing);
      return;
    }

    const heading = document.createElement('h1');
    heading.className = 'perspective__title';
    heading.textContent = `Sholto Maud, according to ${perspective.author}`;
    content.appendChild(heading);

    const meta = document.createElement('p');
    meta.className = 'perspective__meta';
    meta.textContent = `${perspective.author} · ${perspective.date}`;
    content.appendChild(meta);

    perspective.paragraphs.forEach((text) => {
      const p = document.createElement('p');
      p.className = 'perspective__paragraph';
      p.textContent = text;
      content.appendChild(p);
    });
  }
}

if (!customElements.get(PerspectivePageComponent.tagName)) {
  customElements.define(
    PerspectivePageComponent.tagName,
    PerspectivePageComponent
  );
}
