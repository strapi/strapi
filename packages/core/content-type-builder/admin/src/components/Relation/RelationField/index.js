import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Divider } from '@strapi/parts/Divider';
import { Text } from '@strapi/parts/Text';
import { GenericInput } from '@strapi/helper-plugin';
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
      <Row paddingTop={4} paddingBottom={3} justifyContent="center">
        {isMain ? (
          <Text textColor="neutral800" style={{ fontWeight: 600 }}>
            {header}
          </Text>
        ) : (
          <RelationTargetPicker
            target={target}
            oneThatIsCreatingARelationWithAnother={oneThatIsCreatingARelationWithAnother}
          />
        )}
      </Row>
      <Divider />
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
  onChange: () => {},
  oneThatIsCreatingARelationWithAnother: null,
  target: null,
  value: '',
};

RelationFormBox.propTypes = {
  disabled: PropTypes.bool,
  error: PropTypes.string,
  header: PropTypes.string,
  isMain: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  oneThatIsCreatingARelationWithAnother: PropTypes.string,
  target: PropTypes.string,
  value: PropTypes.string,
};

export default RelationFormBox;
