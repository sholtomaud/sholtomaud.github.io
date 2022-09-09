import '../content/content';
import {
    APP_PAGE_THREE_TAG_NAME,
    AppPageThreeComponent,
} from './page-three.component';

if (customElements.get(APP_PAGE_THREE_TAG_NAME) === undefined) {
    customElements.define(APP_PAGE_THREE_TAG_NAME, AppPageThreeComponent);
}
