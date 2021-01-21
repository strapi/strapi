import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Flex, Padded, Picker } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Carret } from 'strapi-helper-plugin';
import Fields from './Fields';
import Header from './Header';
import Wrapper from './Wrapper';
import ConfigureLink from './ConfigureLink';

const FieldPicker = ({ displayedHeaders, items, onChange, onClickReset, slug }) => {
  return (
    <Wrapper>
      <Picker
        position="right"
        renderButtonContent={isOpen => (
          <Flex>
            <div>
              <FontAwesomeIcon icon="cog" style={{ marginRighte: 10 }} />
            </div>
            <Padded left size="sm">
              <Carret fill={isOpen ? '#007eff' : '#292b2c'} isUp={isOpen} />
            </Padded>
          </Flex>
        )}
        renderSectionContent={onToggle => (
          <>
            <ConfigureLink slug={slug} />
            <Header onClick={onClickReset} onToggle={onToggle} />
            <Fields displayedHeaders={displayedHeaders} items={items} onChange={onChange} />
          </>
        )}
      />
    </Wrapper>
  );
};

FieldPicker.propTypes = {
  displayedHeaders: PropTypes.array.isRequired,
  items: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  onClickReset: PropTypes.func.isRequired,
  slug: PropTypes.string.isRequired,
};

export default memo(FieldPicker);
