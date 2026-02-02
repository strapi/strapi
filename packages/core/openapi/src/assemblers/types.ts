import type { Core } from '@strapi/types';

import type { DocumentContext, OperationContext, PathContext, PathItemContext } from '../types';

export interface Assembler {
  assemble(...args: any[]): void;
}

export interface Document extends Assembler {
  assemble(context: DocumentContext): void;
}

export interface Path extends Assembler {
  assemble(context: PathContext): void;
}

export interface PathItem extends Assembler {
  assemble(context: PathItemContext, path: string, routes: Core.Route[]): void;
}

export interface Operation extends Assembler {
  assemble(context: OperationContext, route: Core.Route): void;
}
