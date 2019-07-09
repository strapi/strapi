import React, { memo } from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';
import { capitalize } from 'lodash';
import { Collapse } from 'reactstrap';
import { FormattedMessage } from 'react-intl';
import { PluginHeader } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import Container from '../Container';

function FilterPicker({ actions, isOpen, name, onSubmit }) {
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
        <form
          onSubmit={e => {
            e.preventDefault();

            onSubmit();
          }}
        >
          <PluginHeader
            actions={actions}
            title={renderTitle}
            description={{
              id: `${pluginId}.components.FiltersPickWrapper.PluginHeader.description`,
            }}
          />
        </form>
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
  location: PropTypes.shape({
    search: PropTypes.string.isRequired,
  }),

  name: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
};

export default withRouter(memo(FilterPicker));
