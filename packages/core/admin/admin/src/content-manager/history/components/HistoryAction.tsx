import * as React from 'react';

import { useQueryParams } from '@strapi/helper-plugin';
import { Clock } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import type { DocumentActionComponent } from '../../../core/apis/content-manager';

const StyledClock = styled(Clock)`
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
    icon: <StyledClock />,
    label: formatMessage({
      id: 'content-manager.history.document-action',
      defaultMessage: 'Content History',
    }),
    onClick: () => navigate({ pathname: 'history', search: pluginsQueryParams }),
    disabled: !document || !document.id || !model.startsWith('api::'),
    position: 'header',
  };
};

HistoryAction.type = 'history';

export { HistoryAction };
