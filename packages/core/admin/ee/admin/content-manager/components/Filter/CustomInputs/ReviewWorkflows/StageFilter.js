import * as React from 'react';

import { Flex, Loader, SingleSelect, SingleSelectOption, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useReviewWorkflows } from '../../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import { getStageColorByHex } from '../../../../../pages/SettingsPage/pages/ReviewWorkflows/utils/colors';

export const StageFilter = ({ value, onChange, uid }) => {
  const { formatMessage } = useIntl();
  const {
    workflows: [workflow],
    isLoading,
  } = useReviewWorkflows({ filters: { contentTypes: uid } });

  return (
    <SingleSelect
      aria-label={formatMessage({
        id: 'content-manager.components.Filters.reviewWorkflows.label',
        defaultMessage: 'Search and select an workflow stage to filter',
      })}
      value={value}
      onChange={onChange}
      loading={isLoading}
      // eslint-disable-next-line react/no-unstable-nested-components
      customizeContent={() => (
        <Flex as="span" justifyContent="space-between" alignItems="center" width="100%">
          <Typography textColor="neutral800" ellipsis>
            {value}
          </Typography>
          {isLoading ? <Loader small style={{ display: 'flex' }} /> : null}
        </Flex>
      )}
    >
      {(workflow?.stages ?? []).map(({ id, color, name }) => {
        const { themeColorName } = getStageColorByHex(color);

        return (
          <SingleSelectOption
            key={id}
            startIcon={
              <Flex
                height={2}
                background={color}
                borderColor={themeColorName === 'neutral0' ? 'neutral150' : 'transparent'}
                hasRadius
                shrink={0}
                width={2}
              />
            }
            value={name}
          >
            {name}
          </SingleSelectOption>
        );
      })}
    </SingleSelect>
  );
};

StageFilter.defaultProps = {
  value: '',
};

StageFilter.propTypes = {
  onChange: PropTypes.func.isRequired,
  uid: PropTypes.string.isRequired,
  value: PropTypes.string,
};
