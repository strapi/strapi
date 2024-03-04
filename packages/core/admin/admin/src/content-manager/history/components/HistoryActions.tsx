import * as React from 'react';

import { useQueryParams } from '@strapi/helper-plugin';
import { Clock } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import type { DocumentActionComponent } from '../../../core/apis/content-manager';

/**
 * Because the icon system is completely broken, we have to do
 * this to remove the fill from the cog.
 */
const StyledClock = styled(Clock)`
  path {
    fill: currentColor;
  }
`;

const HistoryAction: DocumentActionComponent = ({ documentId, model }) => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams<{ plugins?: Record<string, unknown> }>();
  const navigate = useNavigate();
  const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

  return {
    icon: <StyledClock />,
    label: formatMessage({
      id: 'content-manager.history.document-action',
      defaultMessage: 'Content History',
    }),
    onClick: () => navigate({ pathname: 'history', search: pluginsQueryParams }),
    disabled: documentId == null || !model.startsWith('api::'),
    position: 'header',
  };
};

HistoryAction.type = 'history';

// TODO check license and feature flag
const HISTORY_ACTIONS = [HistoryAction];

export { HISTORY_ACTIONS };
