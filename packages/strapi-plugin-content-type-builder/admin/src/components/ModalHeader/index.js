import React from 'react';
import PropTypes from 'prop-types';
import { HeaderModalTitle } from 'strapi-helper-plugin';
import { AttributeIcon } from '@buffetjs/core';
import pluginId from '../../pluginId';
import { FormattedMessage } from 'react-intl';

const ModalHeader = ({ headerId, name, type }) => {
  return (
    <section>
      <HeaderModalTitle style={{ textTransform: 'none' }}>
        <AttributeIcon type={type} style={{ margin: 'auto 20px auto 0' }} />
        <FormattedMessage id={`${pluginId}.${headerId}`} values={{ name }} />
      </HeaderModalTitle>
    </section>
  );
};

ModalHeader.defaultProps = {
  headerId: '',
  name: '',
  type: 'contentType',
};

ModalHeader.propTypes = {
  headerId: PropTypes.string,
  name: PropTypes.string,
  type: PropTypes.string,
};

export default ModalHeader;
