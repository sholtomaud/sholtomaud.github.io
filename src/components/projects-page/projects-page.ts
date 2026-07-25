import { BaseComponent } from '../../core/base-component.ts';
import '../site-header/site-header.ts';
import template from './projects-page.html?raw';
import style from './projects-page.css?raw';
import projectsData from '../../generated/projects.json' with { type: 'json' };

interface ProjectArtifact {
  kind: string;
  label: string;
  url: string;
}

interface ProjectItem {
  title: string;
  date?: string;
  summary: string;
  artifacts: ProjectArtifact[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderProjectItem(item: ProjectItem): string {
  const links = item.artifacts
    .map(
      (artifact) =>
        `<a class="project-item__link" href="${escapeHtml(artifact.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(artifact.label)}</a>`
    )
    .join('');

  return `
    <li class="project-item">
      <span class="project-item__title">${escapeHtml(item.title)}</span>
      ${item.summary ? `<p class="project-item__summary">${escapeHtml(item.summary)}</p>` : ''}
      ${links ? `<div class="project-item__links">${links}</div>` : ''}
    </li>
  `;
}

export class ProjectsPageComponent extends BaseComponent {
  static tagName = 'projects-page';

  constructor() {
    super(template, style);
  }

  init() {
    const list = this.querySelector('#projects-list');
    if (!list) return;
    list.innerHTML = (projectsData as ProjectItem[]).map(renderProjectItem).join('');
  }
}

if (!customElements.get(ProjectsPageComponent.tagName)) {
  customElements.define(ProjectsPageComponent.tagName, ProjectsPageComponent);
}
