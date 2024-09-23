import { Box, Divider, Flex, Typography } from '@strapi/design-system';

import { getTrad } from '../../../utils/getTrad';
import { GenericInput } from '../../GenericInputs';

import { RelationTargetPicker } from './RelationTargetPicker/RelationTargetPicker';

interface RelationFormBoxProps {
  disabled?: boolean;
  error?: Record<string, any>;
  header?: string;
  isMain?: boolean;
  name: string;
  onChange: (value: any) => void;
  oneThatIsCreatingARelationWithAnother?: string;
  target?: string;
  value?: string;
}

export const RelationFormBox = ({
  disabled = false,
  error,
  header,
  isMain = false,
  name,
  onChange,
  oneThatIsCreatingARelationWithAnother = '',
  target = '',
  value = '',
}: RelationFormBoxProps) => {
  return (
    <Box background="neutral100" hasRadius borderColor="neutral200">
      <Flex paddingTop={isMain ? 4 : 1} paddingBottom={isMain ? 3 : 1} justifyContent="center">
        {isMain ? (
          <Typography variant="pi" fontWeight="bold" textColor="neutral800">
            {header}
          </Typography>
        ) : (
          <RelationTargetPicker
            target={target}
            oneThatIsCreatingARelationWithAnother={oneThatIsCreatingARelationWithAnother}
          />
        )}
      </Flex>
      <Divider background="neutral200" />
      <Box padding={4}>
        <GenericInput
          disabled={disabled}
          error={error?.id || null}
          intlLabel={{
            id: getTrad('form.attribute.item.defineRelation.fieldName'),
            defaultMessage: 'Field name',
          }}
          name={name}
          onChange={onChange}
          type="text"
          value={value}
        />
      </Box>
    </Box>
  );
};
