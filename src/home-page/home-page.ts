import '../card/card';
import '../content/content';
import {
    APP_HOME_TAG_NAME,
    AppHomeComponent,
} from './home-page.component';

if (customElements.get(APP_HOME_TAG_NAME) === undefined) {
    customElements.define(APP_HOME_TAG_NAME, AppHomeComponent);
}
