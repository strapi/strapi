import type { ApolloServerPlugin } from '@apollo/server-v5';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server-v5/plugin/landingPage/default';
import { isFunction } from 'lodash/fp';

import type { Core } from '@strapi/types';
import type { BaseContext } from 'koa';

type StrapiGraphQLContext = BaseContext & {
  rootQueryArgs?: Record<string, unknown>;
};

export const determineLandingPageV5 = (
  strapi: Core.Strapi
): ApolloServerPlugin<StrapiGraphQLContext> => {
  const { config } = strapi.plugin('graphql');
  const utils = strapi.plugin('graphql').service('utils');

  const configLandingPage = config('landingPage');

  const isProduction = process.env.NODE_ENV === 'production';

  const localLanding = () => {
    strapi.log.debug('Apollo landing page: local');
    utils.playground.setEnabled(true);
    return ApolloServerPluginLandingPageLocalDefault();
  };

  const prodLanding = () => {
    strapi.log.debug('Apollo landing page: production');
    utils.playground.setEnabled(false);
    return ApolloServerPluginLandingPageProductionDefault();
  };

  const userLanding = (userFunction: (strapi?: Core.Strapi) => ApolloServerPlugin | boolean) => {
    strapi.log.debug('Apollo landing page: from user-defined function...');
    const result = userFunction(strapi);
    if (result === true) {
      return localLanding();
    }
    if (result === false) {
      return prodLanding();
    }
    strapi.log.debug('Apollo landing page: user-defined');
    return result;
  };

  const playgroundAlways = config('playgroundAlways');
  if (playgroundAlways !== undefined) {
    strapi.log.warn(
      'The graphql config playgroundAlways is deprecated. This will be removed in Strapi 6. Please use landingPage instead. '
    );
  }
  if (playgroundAlways === false) {
    strapi.log.warn(
      'graphql config playgroundAlways:false has no effect, please use landingPage:false to disable Graphql Playground in all environments'
    );
  }

  if (playgroundAlways || configLandingPage === true) {
    return localLanding();
  }

  if (configLandingPage === false) {
    return prodLanding();
  }

  if (configLandingPage === undefined) {
    return isProduction ? prodLanding() : localLanding();
  }

  if (isFunction(configLandingPage)) {
    return userLanding(configLandingPage);
  }

  strapi.log.warn(
    'Your Graphql landing page has been disabled because there is a problem with your Graphql settings'
  );
  return prodLanding();
};
