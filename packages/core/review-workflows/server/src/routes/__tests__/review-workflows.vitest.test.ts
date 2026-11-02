import { describe, expect, it } from 'vitest';
import Router from '@koa/router';

import reviewWorkflows from '../review-workflows';

const router = new Router();
reviewWorkflows.routes.forEach(({ method, path, handler }) => {
  router.register(path, [method], () => undefined, { name: handler });
});

const matchedHandlers = (method: string, url: string) =>
  router.match(url, method).pathAndMethod.map((layer) => layer.name);

describe('Review Workflows routes', () => {
  it.each(['collection-types', 'single-types'])('routes %s entries to their handlers', (kind) => {
    const entry = `/content-manager/${kind}/api::article.article/1`;

    expect(matchedHandlers('PUT', `${entry}/stage`)).toEqual(['stages.updateEntity']);
    expect(matchedHandlers('GET', `${entry}/stages`)).toEqual(['stages.listAvailableStages']);
    expect(matchedHandlers('PUT', `${entry}/assignee`)).toEqual(['assignees.updateEntity']);
  });
});
