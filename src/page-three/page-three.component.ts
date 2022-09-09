import html from './page-three.component.html?inline';

const template = document.createElement('template');
template.innerHTML = `${html}`;

export const APP_PAGE_THREE_TAG_NAME = 'app-page-three';

export class AppPageThreeComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot?.appendChild(template.content.cloneNode(true));
    }
}
