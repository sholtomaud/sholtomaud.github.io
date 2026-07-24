interface RouteDefinition {
  path: string;
  component: string;
  beforeEnter?: (to: {
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
  }) => boolean | string | void | Promise<boolean | string | void>;
}

interface RegisteredRoute extends RouteDefinition {
  regex: RegExp;
  paramNames: string[];
}

export class Router {
  private static instance: Router;
  private routes: RegisteredRoute[] = [];
  private currentPath = '';

  private constructor() {
    window.addEventListener('popstate', this.handleRoute.bind(this));
  }

  static getInstance(): Router {
    if (!Router.instance) {
      Router.instance = new Router();
    }
    return Router.instance;
  }

  private getAppPath(): string {
    const pathname = window.location.pathname;
    const BASE_URL = (window as any).BOBA_BASE_URL || '/';
    const normalizedBaseUrl =
      BASE_URL.endsWith('/') || BASE_URL === '/' ? BASE_URL : BASE_URL + '/';

    if (
      pathname.startsWith(normalizedBaseUrl) &&
      normalizedBaseUrl.length > 1
    ) {
      let appPath = pathname.substring(normalizedBaseUrl.length);
      if (!appPath.startsWith('/')) {
        appPath = '/' + appPath;
      }
      return (appPath === '' ? '/' : appPath) + window.location.search;
    }
    return (
      (pathname.startsWith('/') ? pathname : '/' + pathname) +
      window.location.search
    );
  }

  registerRoute(route: RouteDefinition) {
    const normalizedPath = route.path.startsWith('/')
      ? route.path
      : '/' + route.path;

    const paramNames: string[] = [];
    const regexSource = normalizedPath.replace(
      /:([^\/]+)/g,
      (_, paramName) => {
        paramNames.push(paramName);
        return '([^\\/]+)';
      }
    );

    const regex = new RegExp(`^${regexSource}$`);
    this.routes.push({ ...route, path: normalizedPath, regex, paramNames });
  }

  navigate(appPath: string) {
    const pathAndQuery = appPath.startsWith('/') ? appPath : '/' + appPath;
    const BASE_URL = (window as any).BOBA_BASE_URL || '/';

    const [pathPart, queryString] = pathAndQuery.split('?');
    const dummyAbsoluteBase = 'http://dummy';
    const publicPath = new URL(
      pathPart.substring(1),
      dummyAbsoluteBase + (BASE_URL.endsWith('/') ? BASE_URL : BASE_URL + '/')
    ).pathname;

    const finalPath = publicPath + (queryString ? '?' + queryString : '');

    if (window.location.pathname + window.location.search !== finalPath) {
      window.history.pushState({}, '', finalPath);
    }
    this.handleRoute();
  }

  private async handleRoute() {
    const appPathToMatch = this.getAppPath();
    const [pathPart, queryString] = appPathToMatch.split('?');

    const searchParams = new URLSearchParams(queryString || '');
    const query = Object.fromEntries(searchParams.entries());

    const match = this.findRoute(pathPart);

    if (match) {
      const to = { path: pathPart, params: match.params, query };

      if (match.route.beforeEnter) {
        const guardResult = await match.route.beforeEnter(to);
        if (guardResult === false) {
          if (this.currentPath && this.currentPath !== appPathToMatch) {
            this.navigate(this.currentPath);
          }
          return;
        } else if (typeof guardResult === 'string') {
          this.navigate(guardResult);
          return;
        }
      }

      this.currentPath = appPathToMatch;
      this.loadComponent(match.route.component, match.params, query);
    } else {
      this.show404();
    }
  }

  private findRoute(
    path: string
  ): { route: RegisteredRoute; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        return { route, params };
      }
    }
    return null;
  }

  private async loadComponent(
    tagName: string,
    params: Record<string, string> = {},
    query: Record<string, string> = {}
  ) {
    const outlet = document.querySelector('#router-outlet');
    if (!outlet) return;

    try {
      if (!customElements.get(tagName)) {
        await import(`../../components/${tagName}/${tagName}.ts`);
      }

      const element = document.createElement(tagName);
      Object.assign(element, params);
      (element as any).params = params;
      (element as any).query = query;

      outlet.innerHTML = '';
      outlet.appendChild(element);
    } catch (error) {
      console.error(`Failed to load component: ${tagName}`, error);
      this.show404();
    }
  }

  private show404() {
    const outlet = document.querySelector('#router-outlet');
    if (outlet) {
      outlet.innerHTML = `
        <div class="route-404">
          <h1>404</h1>
          <h2>Page not found</h2>
          <p>The page you're looking for doesn't exist or has moved.</p>
          <a href="/" data-nav>Back home</a>
        </div>
      `;
    }
  }
}
