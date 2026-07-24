import { Router } from '../../core/router/router.ts';
import { BaseComponent } from '../../core/base-component.ts';
import template from './site-header.html?raw';
import style from './site-header.css?raw';

export class SiteHeaderComponent extends BaseComponent {
  static tagName = 'site-header';

  constructor() {
    super(template, style);
  }

  init() {
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';

    this.querySelectorAll<HTMLAnchorElement>('a[data-nav]').forEach(
      (link) => {
        const href = link.getAttribute('href');
        const isCurrent =
          href === currentPath ||
          (!!href && href !== '/' && currentPath.startsWith(href + '/'));
        if (isCurrent) {
          link.setAttribute('aria-current', 'page');
        }
        link.addEventListener('click', (e) => {
          e.preventDefault();
          if (href) Router.getInstance().navigate(href);
        });
      }
    );
  }
}

if (!customElements.get(SiteHeaderComponent.tagName)) {
  customElements.define(SiteHeaderComponent.tagName, SiteHeaderComponent);
}
