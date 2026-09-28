import { RenderMode, ServerRoute } from '@angular/ssr';

// Every route renders in the browser. The session lives in localStorage, which the server
// can't see - server-rendering would make the auth guards treat every visitor as logged
// out, briefly showing the login page on each reload before the browser caught up and
// redirected. Rendered client-side, the guards run once, with the real session.
// (Server/prerender modes can still be opted into per route, e.g. for public pages.)
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
