import type { RequestContext } from './types';

export const isContentManagerRoute = ({ state }: RequestContext) =>
  state.route?.info?.pluginName === 'content-manager' && state.route?.info?.type === 'admin';
