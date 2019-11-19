import React from 'react';
import PropTypes from 'prop-types';
import { HeaderModalTitle } from 'strapi-helper-plugin';
import { AttributeIcon } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import { upperFirst } from 'lodash';
import pluginId from '../../pluginId';

const ModalHeader = ({ headerId, iconType, name }) => {
  return (
    <section>
      <HeaderModalTitle style={{ textTransform: 'none' }}>
        <AttributeIcon type={iconType} style={{ margin: 'auto 20px auto 0' }} />
        {headerId && (
          <FormattedMessage id={`${pluginId}.${headerId}`} values={{ name }} />
        )}
        {!headerId && <span>{upperFirst(name)}</span>}
      </HeaderModalTitle>
    </section>
  );
};

ModalHeader.defaultProps = {
  headerId: '',
  iconType: 'contentType',
  name: '',
};

ModalHeader.propTypes = {
  headerId: PropTypes.string,
  iconType: PropTypes.string,
  name: PropTypes.string,
};

export default ModalHeader;
