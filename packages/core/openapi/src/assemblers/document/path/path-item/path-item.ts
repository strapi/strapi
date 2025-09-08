import type { Core } from '@strapi/types';
import { type PartialContext, PathItemContextFactory } from '../../../../context';

import type { PathContext, PathItemContext, PathItemContextData } from '../../../../types';

import { createDebugger } from '../../../../utils';

import type { Assembler } from '../../..';

const debug = createDebugger('assembler:path-item');

export class PathItemAssembler implements Assembler.Path {
  private readonly _assemblers: Assembler.PathItem[];

  private readonly _contextFactory: PathItemContextFactory;

  constructor(assemblers: Assembler.PathItem[], contextFactory: PathItemContextFactory) {
    this._assemblers = assemblers;
    this._contextFactory = contextFactory;
  }

  assemble(context: PathContext): void {
    const { output, routes } = context;

    const routesByPath = this._groupRoutesByPath(routes);

    debug(
      'grouping routes by path, found %O groups for %O routes',
      Object.keys(routesByPath).length,
      routes.length
    );

    for (const [path, routes] of Object.entries(routesByPath)) {
      const openAPIPath = this._formatPath(path);

      debug(
        'assembling path item for %o (%o)...',
        openAPIPath,
        routes.map((route) => route.method).join(', ')
      );

      const pathItemContext = this._createPathItemContext(context);

      for (const assembler of this._assemblers) {
        debug('running assembler: %s...', assembler.constructor.name);

        assembler.assemble(pathItemContext, path, routes);
      }

      output.data[openAPIPath] = pathItemContext.output.data;
    }
  }

  private _createPathItemContext(context: PathContext): PathItemContext {
    const initProps: PartialContext<PathItemContextData> = {
      strapi: context.strapi,
      registries: context.registries,
      routes: context.routes,
      timer: context.timer,
    };

    return this._contextFactory.create(initProps);
  }

  private _formatPath(path: string): string {
    return path.replace(/:([^/]+)/g, '{$1}');
  }

  private _groupRoutesByPath(routes: Core.Route[]): Record<string, Core.Route[]> {
    return routes.reduce<Record<string, Core.Route[]>>((acc, route) => {
      const { path } = route;

      if (!Array.isArray(acc[path])) {
        acc[path] = [];
      }

      acc[path].push(route);

      return acc;
    }, {});
  }
}
