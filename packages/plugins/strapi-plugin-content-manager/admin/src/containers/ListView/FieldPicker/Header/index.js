import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Flex, Padded, Text } from '@buffetjs/core';
import { BaselineAlignment, useGlobalContext } from 'strapi-helper-plugin';
import { getTrad } from '../../../../utils';
import Reset from './Reset';

const Header = ({ onClick, onToggle }) => {
  const { emitEvent } = useGlobalContext();

  const handleClick = () => {
    onClick();
    onToggle();

    emitEvent('willChangeListFieldsSettings');
  };

  return (
    <BaselineAlignment top size="19px">
      <Padded left right size="xs">
        <Padded left right size="sm">
          <Flex justifyContent="space-between">
            <Text fontWeight="bold">
              <FormattedMessage id={getTrad('containers.ListPage.displayedFields')} />
            </Text>
            <Reset color="mediumBlue" cursor="pointer" onClick={handleClick}>
              <FormattedMessage id={getTrad('containers.Edit.reset')} />
            </Reset>
          </Flex>
        </Padded>
      </Padded>
    </BaselineAlignment>
  );
};

Header.propTypes = {
  onClick: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default Header;
