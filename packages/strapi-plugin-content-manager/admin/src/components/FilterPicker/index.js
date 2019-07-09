import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { capitalize } from 'lodash';
import { Collapse } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import { PluginHeader } from 'strapi-helper-plugin';

import Container from '../Container';
import pluginId from '../../pluginId';

function FilterPicker({ actions, isOpen, name }) {
  const renderTitle = () => (
    <FormattedMessage
      id={`${pluginId}.components.FiltersPickWrapper.PluginHeader.title.filter`}
    >
      {message => (
        <span>
          {capitalize(name)}&nbsp;-&nbsp;
          <span>{message}</span>
        </span>
      )}
    </FormattedMessage>
  );
  return (
    <Collapse isOpen={isOpen}>
      <Container style={{ backgroundColor: 'white' }}>
        <PluginHeader
          actions={actions}
          title={renderTitle}
          description={{
            id: `${pluginId}.components.FiltersPickWrapper.PluginHeader.description`,
          }}
        />
      </Container>
    </Collapse>
  );
}

FilterPicker.defaultProps = {
  actions: [],
  isOpen: false,
  name: '',
};

FilterPicker.propTypes = {
  actions: PropTypes.array,
  isOpen: PropTypes.bool,
  name: PropTypes.string,
};

export default memo(FilterPicker);
