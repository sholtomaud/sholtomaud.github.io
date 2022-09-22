import {
    DISPLAY_PDF,
    DisplayPDFComponent,
} from './display-pdf.component';

if (customElements.get(DISPLAY_PDF) === undefined) {
    customElements.define(DISPLAY_PDF, DisplayPDFComponent);
}
