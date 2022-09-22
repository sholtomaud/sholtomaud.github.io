import '../card/card';
import '../content/content';
import {
    TAG_NAME,
    Experiment1Component,
} from './experiment-1.component';

if (customElements.get(TAG_NAME) === undefined) {
    customElements.define(TAG_NAME, Experiment1Component);
}
