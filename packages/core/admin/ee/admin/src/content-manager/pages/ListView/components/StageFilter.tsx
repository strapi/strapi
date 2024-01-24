import {
  Flex,
  Loader,
  SingleSelect,
  SingleSelectOption,
  SingleSelectProps,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useReviewWorkflows } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/hooks/useReviewWorkflows';
import { getStageColorByHex } from '../../../../pages/SettingsPage/pages/ReviewWorkflows/utils/colors';

interface StageFilterProps extends Pick<SingleSelectProps, 'value' | 'onChange'> {
  uid?: string;
}

const StageFilter = ({ value, onChange, uid }: StageFilterProps) => {
  const { formatMessage } = useIntl();
  const { workflows, isLoading } = useReviewWorkflows({ filters: { contentTypes: uid } });

  const [workflow] = workflows ?? [];

  return (
    <SingleSelect
      aria-label={formatMessage({
        id: 'content-manager.components.Filters.reviewWorkflows.label',
        defaultMessage: 'Search and select an workflow stage to filter',
      })}
      value={value}
      onChange={onChange}
      loading={isLoading}
      // @ts-expect-error – DS type error with SingleSelect['customizeContent']
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
        const { themeColorName } = getStageColorByHex(color) ?? {};

        return (
          <SingleSelectOption
            key={id}
            startIcon={
              <Flex
                height={2}
                background={color}
                borderColor={themeColorName === 'neutral0' ? 'neutral150' : undefined}
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

export { StageFilter };
export type { StageFilterProps };
