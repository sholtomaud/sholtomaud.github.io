import html from './display-pdf.component.html?inline';
import css from './display-pdf.component.css?inline';


const template = document.createElement('template');
template.innerHTML = `<style>${css}</style>${html}`;

export const TAG_NAME = 'display-pdf';

export class DisplayPDFComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot?.appendChild(template.content.cloneNode(true));
    }

    connectedCallback() {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        const pdf = urlParams.get('pdf');

        if (pdf) {
            this.shadowRoot?.querySelector('embed')?.setAttribute('src', pdf);
        }
    }

}
