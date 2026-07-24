import { BaseComponent } from '../../core/base-component.ts';
import '../site-header/site-header.ts';
import template from './works-page.html?raw';
import style from './works-page.css?raw';
import worksData from '../../generated/works.json' with { type: 'json' };

interface WorkArtifact {
  kind: string;
  label: string;
  url: string;
}

interface WorkItem {
  title: string;
  date?: string;
  summary: string;
  artifacts: WorkArtifact[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderWorkItem(item: WorkItem): string {
  const links = item.artifacts
    .map(
      (artifact) =>
        `<a class="work-item__link" href="${escapeHtml(artifact.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(artifact.label)}</a>`
    )
    .join('');

  return `
    <li class="work-item">
      <span class="work-item__title">${escapeHtml(item.title)}</span>
      ${item.summary ? `<p class="work-item__summary">${escapeHtml(item.summary)}</p>` : ''}
      ${links ? `<div class="work-item__links">${links}</div>` : ''}
    </li>
  `;
}

export class WorksPageComponent extends BaseComponent {
  static tagName = 'works-page';

  constructor() {
    super(template, style);
  }

  init() {
    const list = this.querySelector('#works-list');
    if (!list) return;
    list.innerHTML = (worksData as WorkItem[]).map(renderWorkItem).join('');
  }
}

if (!customElements.get(WorksPageComponent.tagName)) {
  customElements.define(WorksPageComponent.tagName, WorksPageComponent);
}
