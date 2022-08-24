import html from './home-page.component.html?inline';
import css from './home-page.component.css?inline';


const template = document.createElement('template');
template.innerHTML = `<style>${css}</style>${html}`;

export const APP_HOME_TAG_NAME = 'home-page';

export class AppHomeComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot?.appendChild(template.content.cloneNode(true));
    }
}
