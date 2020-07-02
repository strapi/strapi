import React, { useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Flex, Padded, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';
import EyeSlashed from '../../icons/EyeSlashed';
import BaselineAlignement from './BaselineAlignement';
import Field from './Field';

const NotAllowedInput = ({ label, spacerHeight }) => {
  const { formatMessage } = useIntl();
  const formatMessageRef = useRef(formatMessage);
  const text = useMemo(
    () => formatMessageRef.current({ id: getTrad('components.NotAllowedInput.text') }),
    []
  );

  return (
    <Padded bottom size="smd">
      <Text fontWeight="semiBold" lineHeight="18px">
        {label}
      </Text>
      <Field>
        <Padded left right size="sm">
          <Flex>
            <Padded right size="sm">
              <EyeSlashed />
            </Padded>

            <Text fontSize="md" color="grey" as="div" lineHeight="18px" ellipsis>
              {text}
            </Text>
          </Flex>
        </Padded>
      </Field>
      <BaselineAlignement height={spacerHeight} />
    </Padded>
  );
};

NotAllowedInput.defaultProps = {
  label: '',
  spacerHeight: '7px',
};

NotAllowedInput.propTypes = {
  label: PropTypes.string,
  spacerHeight: PropTypes.string,
};

export default NotAllowedInput;
