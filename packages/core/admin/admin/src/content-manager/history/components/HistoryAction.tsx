import * as React from 'react';

import { useQueryParams } from '@strapi/helper-plugin';
import { History } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import type { DocumentActionComponent } from '../../../core/apis/content-manager';

const StyledHistory = styled(History)`
  path {
    fill: currentColor;
  }
`;

const HistoryAction: DocumentActionComponent = ({ model, document }) => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams<{ plugins?: Record<string, unknown> }>();
  const navigate = useNavigate();
  const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

  // TODO: also check license before adding history action
  if (!window.strapi.future.isEnabled('history')) {
    return null;
  }

  return {
    icon: <StyledHistory />,
    label: formatMessage({
      id: 'content-manager.history.document-action',
      defaultMessage: 'Content History',
    }),
    onClick: () => navigate({ pathname: 'history', search: pluginsQueryParams }),
    disabled:
      /**
       * The user is creating a new document.
       * It hasn't been saved yet, so there's no history to go to
       */
      !document ||
      /**
       * The document has been created but the current dimension has never been saved.
       * For example, the user is creating a new locale in an existing document,
       * so there's no history for the document in that locale
       */
      !document.id ||
      /**
       * History is only available for content types created by the user.
       * These have the `api::` prefix, as opposed to the ones created by Strapi or plugins,
       * which start with `admin::` or `plugin::`
       */
      !model.startsWith('api::'),
    position: 'header',
  };
};

HistoryAction.type = 'history';

export { HistoryAction };
