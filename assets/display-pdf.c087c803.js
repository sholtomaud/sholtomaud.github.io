import"./card.1606fb40.js";import"./content.31d6e008.js";const c="<embed frameborder=0 height=1100px scrolling=auto src=/Maud-2022-Experiment1-Draft-v1.1.pdf type=application/pdf width=850px>",r=`:host{display:inline-block;color:var(--text-color);margin-top:20px}
`,a=document.createElement("template");a.innerHTML=`<style>${r}</style>${c}`;const s="display-pdf";class l extends HTMLElement{constructor(){var t;super(),this.attachShadow({mode:"open"}),(t=this.shadowRoot)==null||t.appendChild(a.content.cloneNode(!0))}connectedCallback(){var o,n;const t=window.location.search,e=new URLSearchParams(t).get("pdf");e&&((n=(o=this.shadowRoot)==null?void 0:o.querySelector("embed"))==null||n.setAttribute("src",e))}}customElements.get(s)===void 0&&customElements.define(s,l);