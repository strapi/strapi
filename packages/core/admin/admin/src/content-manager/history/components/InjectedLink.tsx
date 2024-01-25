import * as React from 'react';

import { LinkButton } from '@strapi/design-system/v2';
import { useQueryParams } from '@strapi/helper-plugin';
import { stringify } from 'qs';
import { NavLink } from 'react-router-dom';

/**
 * This is a temporary component to easily access the history page.
 * TODO: delete it when the document actions API is ready
 */

const InjectedLink = () => {
  const [{ query }] = useQueryParams<{ plugins?: Record<string, unknown> }>();
  const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

  return (
    // @ts-expect-error - types are not inferred correctly through the as prop.
    <LinkButton as={NavLink} variant="primary" to={`history?${pluginsQueryParams}`}>
      History
    </LinkButton>
  );
};

export { InjectedLink };
