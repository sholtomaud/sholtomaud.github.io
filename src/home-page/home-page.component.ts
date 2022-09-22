import html from './home-page.component.html?inline';
import css from './home-page.component.css?inline';
// import pdfs from "../data/pdfs.json";


// function convert(t: number) {
//     return ('0' + (t)).slice(-2);
// }

// function getVersion() {
//     const dt = new Date();
//     // dt.setDate(dt.getDate() + 20);

//     // var now = Date.now()
//     // var epoch = Math.round(now / 1000)
//     // var epochStr = epoch.toString()

//     // const year = dt.getFullYear();
//     // const month = dt.getMonth();
//     // const m = dt.getMinutes();
//     // const s = "0" + dt.getSeconds();

//     return `${dt.getFullYear()}.${convert(dt.getMonth() + 1)}.${convert(dt.getDate())}${convert(dt.getHours())}${convert(dt.getMinutes())}${convert(dt.getSeconds())}`;
// }

const template = document.createElement('template');
template.innerHTML = `<style>${css}</style>${html}`;



export const APP_HOME_TAG_NAME = 'home-page';

export class AppHomeComponent extends HTMLElement {
    constructor() {
        super();
        // console.log(this)
        this.attachShadow({ mode: 'open' });
        this.shadowRoot?.appendChild(template.content.cloneNode(true));
    }
    connectedCallback() {
        // @ts-ignore
        window.routerLinkSetup(this.shadowRoot);
    }
}

