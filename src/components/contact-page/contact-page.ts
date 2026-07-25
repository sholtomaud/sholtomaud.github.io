import { BaseComponent } from '../../core/base-component.ts';
import '../site-header/site-header.ts';
import template from './contact-page.html?raw';
import style from './contact-page.css?raw';

// ROT13 self-inverse cipher. This isn't real security — it just keeps the
// address out of the shipped bundle as a plain literal so trivial source
// scrapers can't grep it. Run it on a value to encode, run it again to decode.
const rot13 = (value: string): string =>
  value.replace(/[a-z]/gi, (char) => {
    const base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
  });

// ── EDIT: your email, ROT13-encoded (i.e. rot13('s.maud@unsw.edu.au')).
// To change it, ROT13 the new address — never store the plain string here.
const EMAIL_ENCODED = 'f.znhq@hafj.rqh.nh';

export class ContactPageComponent extends BaseComponent {
  static tagName = 'contact-page';

  constructor() {
    super(template, style);
  }

  init() {
    const emailLink = this.querySelector<HTMLAnchorElement>('#email-link');
    const emailLabel = this.querySelector('#email-link .page__link-label');
    if (!emailLink || !emailLabel) return;

    // The meaningful protection: don't decode the address into the DOM (label
    // text or mailto: href) on load. A page-loading scraper — even one that
    // runs JS and reads the rendered DOM — sees only the "Email" placeholder.
    // The real address is written in only when a human actually interacts.
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      const address = rot13(EMAIL_ENCODED);
      emailLink.href = `mailto:${address}`;
      emailLabel.textContent = address;
    };

    // pointerenter (mouse hover) and focus (keyboard tab) both fire before a
    // click, so by activation time the href is already the real mailto:. The
    // click handler is the backstop for touch — it runs before the anchor's
    // default navigation, so the first tap still opens the mail client.
    emailLink.addEventListener('pointerenter', reveal, { once: true });
    emailLink.addEventListener('focus', reveal, { once: true });
    emailLink.addEventListener('click', reveal, { once: true });
  }
}

if (!customElements.get(ContactPageComponent.tagName)) {
  customElements.define(ContactPageComponent.tagName, ContactPageComponent);
}
