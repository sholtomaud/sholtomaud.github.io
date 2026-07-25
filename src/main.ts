import './styles/global.css';
import { Router } from './core/router/router.ts';
import './components/home-page/home-page.ts';
import './components/research-page/research-page.ts';
import './components/projects-page/projects-page.ts';
import './components/writing-page/writing-page.ts';
import './components/contact-page/contact-page.ts';
import './components/about-page/about-page.ts';
import './components/perspective-page/perspective-page.ts';
import './components/site-header/site-header.ts';

// sholtomaud.github.io is a GitHub *user* page, served at the domain root —
// unlike a project page (username.github.io/repo-name), there's no repo
// segment to strip from the path.
(window as any).BOBA_BASE_URL = '/';

const router = Router.getInstance();
router.registerRoute({ path: '/', component: 'home-page' });
router.registerRoute({ path: '/research', component: 'research-page' });
router.registerRoute({ path: '/projects', component: 'projects-page' });
router.registerRoute({ path: '/writing', component: 'writing-page' });
router.registerRoute({ path: '/contact', component: 'contact-page' });
router.registerRoute({ path: '/about', component: 'about-page' });
router.registerRoute({ path: '/about/:slug', component: 'perspective-page' });

router.navigate(
  window.location.pathname.startsWith('/')
    ? window.location.pathname
    : '/' + window.location.pathname
);
