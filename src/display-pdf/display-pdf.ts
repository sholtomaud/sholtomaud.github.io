import '../card/card';
import '../content/content';
import {
    TAG_NAME,
    DisplayPDFComponent,
} from './display-pdf.component';

if (customElements.get(TAG_NAME) === undefined) {
    customElements.define(TAG_NAME, DisplayPDFComponent);
}
