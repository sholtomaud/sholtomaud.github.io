import { Router } from '../../core/router/router.ts';
import { BaseComponent } from '../../core/base-component.ts';
import template from './home-page.html?raw';
import style from './home-page.css?raw';

// © 2026.7.22 19:58:01 EST Sholto Maud — ticks in the visitor's own local
// time/zone rather than a fixed one, so it's always actually "now".
function formatCopyright(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const datePart = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  const zone = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;
  return `© ${datePart} ${timePart}${zone ? ' ' + zone : ''} Sholto Maud`;
}

export class HomePageComponent extends BaseComponent {
  static tagName = 'home-page';
  private clockInterval?: number;

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

    const clock = this.querySelector('#clock');
    if (clock) {
      const tick = () => {
        clock.textContent = formatCopyright(new Date());
      };
      tick();
      this.clockInterval = window.setInterval(tick, 1000);
    }
  }

  disconnectedCallback() {
    if (this.clockInterval !== undefined) {
      window.clearInterval(this.clockInterval);
    }
  }
}

if (!customElements.get(HomePageComponent.tagName)) {
  customElements.define(HomePageComponent.tagName, HomePageComponent);
}
