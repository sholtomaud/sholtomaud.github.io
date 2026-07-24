import { BaseComponent } from '../../core/base-component.ts';
import '../site-header/site-header.ts';
import template from './contact-page.html?raw';
import style from './contact-page.css?raw';

// ── EDIT: your email, split so it never sits as one plain-text string in
// the shipped HTML/JS — most address-harvesting bots only read raw source,
// not rendered DOM, so this alone stops the bulk of them.
const EMAIL_USER = 's.maud';
const EMAIL_DOMAIN = 'unsw.edu.au';

export class ContactPageComponent extends BaseComponent {
  static tagName = 'contact-page';

  constructor() {
    super(template, style);
  }

  init() {
    const emailLink = this.querySelector<HTMLAnchorElement>('#email-link');
    const emailLabel = this.querySelector('#email-link .page__link-label');
    if (emailLink && emailLabel) {
      const address = `${EMAIL_USER}@${EMAIL_DOMAIN}`;
      emailLink.href = `mailto:${address}`;
      emailLabel.textContent = address;
    }
  }
}

if (!customElements.get(ContactPageComponent.tagName)) {
  customElements.define(ContactPageComponent.tagName, ContactPageComponent);
}
