import { BaseComponent } from '../../core/base-component.ts';
import '../site-header/site-header.ts';
import template from './writing-page.html?raw';
import style from './writing-page.css?raw';
import writingData from '../../generated/writing.json' with { type: 'json' };

interface WritingArtifact {
  kind: string;
  label: string;
  url: string;
}

interface WritingItem {
  title: string;
  date?: string;
  summary: string;
  artifacts: WritingArtifact[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderWritingItem(item: WritingItem): string {
  const links = item.artifacts
    .map(
      (artifact) =>
        `<a class="writing-item__link" href="${escapeHtml(artifact.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(artifact.label)}</a>`
    )
    .join('');

  return `
    <li class="writing-item">
      <span class="writing-item__title">${escapeHtml(item.title)}</span>
      ${item.summary ? `<p class="writing-item__summary">${escapeHtml(item.summary)}</p>` : ''}
      ${links ? `<div class="writing-item__links">${links}</div>` : ''}
    </li>
  `;
}

export class WritingPageComponent extends BaseComponent {
  static tagName = 'writing-page';

  constructor() {
    super(template, style);
  }

  init() {
    const mount = this.querySelector('#writing-mount');
    if (!mount) return;
    const items = writingData as WritingItem[];
    mount.innerHTML = items.length
      ? `<ul class="writing__list">${items.map(renderWritingItem).join('')}</ul>`
      : `<p class="writing__empty">New writing is on the way.</p>`;
  }
}

if (!customElements.get(WritingPageComponent.tagName)) {
  customElements.define(WritingPageComponent.tagName, WritingPageComponent);
}
