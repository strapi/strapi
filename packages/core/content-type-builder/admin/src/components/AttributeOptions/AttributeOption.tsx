/**
 *
 * AttributeOption
 *
 */

import { Box, Flex, Typography, Icon } from '@strapi/design-system';
import { Spark } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useFormModalNavigation } from '../../hooks/useFormModalNavigation';
import { getTrad } from '../../utils/getTrad';
import { AttributeIcon, IconByType } from '../AttributeIcon';

import { OptionBoxWrapper } from './OptionBoxWrapper';

const newAttributes: string[] = [];

const NewBadge = () => (
  <Flex grow={1} justifyContent="flex-end">
    <Flex gap={1} hasRadius background="alternative100" padding={`${2 / 16}rem ${4 / 16}rem`}>
      <Icon width={`${10 / 16}rem`} height={`${10 / 16}rem`} as={Spark} color="alternative600" />
      <Typography textColor="alternative600" variant="sigma">
        New
      </Typography>
    </Flex>
  </Flex>
);

type AttributeOptionProps = {
  type: IconByType;
};

export const AttributeOption = ({ type = 'text' }: AttributeOptionProps) => {
  const { formatMessage } = useIntl();

  const { onClickSelectField } = useFormModalNavigation();

  const handleClick = () => {
    const step = type === 'component' ? '1' : null;

    onClickSelectField({
      attributeType: type,
      step,
    });
  };

  return (
    <OptionBoxWrapper padding={4} as="button" hasRadius type="button" onClick={handleClick}>
      <Flex>
        <AttributeIcon type={type} />
        <Box paddingLeft={4} width="100%">
          <Flex justifyContent="space-between">
            <Typography fontWeight="bold">
              {formatMessage({ id: getTrad(`attribute.${type}`), defaultMessage: type })}
            </Typography>
            {newAttributes.includes(type) && <NewBadge />}
          </Flex>
          <Flex>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTrad(`attribute.${type}.description`),
                defaultMessage: 'A type for modeling data',
              })}
            </Typography>
          </Flex>
        </Box>
      </Flex>
    </OptionBoxWrapper>
  );
};
