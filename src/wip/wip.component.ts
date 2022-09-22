import html from './wip.component.html?inline';

const template = document.createElement('template');
template.innerHTML = `${html}`;

export const PAGE_TAG = 'wip-page';

export class WipComponent extends HTMLElement {

    static get observedAttributes() {
        return ['src'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot?.appendChild(template.content.cloneNode(true));
    }

    // attributeChangedCallback(attrName: any, oldVal: any, newVal: any) {
    //     console.log(attrName, oldVal, newVal)
    //     if (oldVal !== newVal) {
    //         this.innerHTML = '';
    //         //             readSrc(this, newVal).then(
    //         //                 data => {
    //         //                     this.innerHTML = `<pre>
    //         // ${JSON.stringify(data, 0, 2)}
    //         //             </pre>`;
    //         //                 }
    //         //             );
    //     }
    // }
}
