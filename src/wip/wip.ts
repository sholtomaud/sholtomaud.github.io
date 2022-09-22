import '../content/content';
import {
    PAGE_TAG,
    WipComponent,
} from './wip.component';

if (customElements.get(PAGE_TAG) === undefined) {
    customElements.define(PAGE_TAG, WipComponent);
}
