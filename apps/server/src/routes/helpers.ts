import { store } from '../config/store.js';
import { compileRoutes } from '../proxy/matcher.js';

export function recompileRoutes(): void {
  const specs = new Map(store.getSpecs().map((s) => [s.id, s]));
  compileRoutes(store.getActiveEndpoints(), specs);
}
