import type {
  DefaultContext,
  DefaultState,
  ParameterizedContext,
  Request,
} from 'koa';
import type { ParsedUrlQuery } from 'querystring';

export interface StrapiAppState {}

export interface StrapiAppContext
  extends ParameterizedContext<DefaultState & StrapiAppState, DefaultContext & {}, any> {
  query: ParsedUrlQuery & Record<string, any>;
  request: Request & { body: any, query?: ParsedUrlQuery };
}
