import React from 'react';
import { FilterIcon } from 'strapi-helper-plugin';
import { FormattedMessage } from 'react-intl';
import Wrapper from './Wrapper';

const AddFilterCTA = () => {
  return (
    <Wrapper type="button">
      <FilterIcon />
      <FormattedMessage id="app.utils.filters" />
    </Wrapper>
  );
};

export default AddFilterCTA;
