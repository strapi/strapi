import React from 'react';

import { Box, Divider, Flex, Typography } from '@strapi/design-system';
import { GenericInput } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';

import getTrad from '../../../utils/getTrad';

import RelationTargetPicker from './RelationTargetPicker';

const RelationFormBox = ({
  disabled,
  error,
  header,
  isMain,
  name,
  onChange,
  oneThatIsCreatingARelationWithAnother,
  target,
  value,
}) => {
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

RelationFormBox.defaultProps = {
  disabled: false,
  error: null,
  header: null,
  isMain: false,
  onChange() {},
  oneThatIsCreatingARelationWithAnother: null,
  target: null,
  value: '',
};

RelationFormBox.propTypes = {
  disabled: PropTypes.bool,
  error: PropTypes.object,
  header: PropTypes.string,
  isMain: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  oneThatIsCreatingARelationWithAnother: PropTypes.string,
  target: PropTypes.string,
  value: PropTypes.string,
};

export default RelationFormBox;
