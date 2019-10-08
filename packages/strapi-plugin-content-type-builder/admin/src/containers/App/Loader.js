import React from 'react';
import { LoadingIndicator } from 'strapi-helper-plugin';

import Wrapper from './Wrapper';

const Loader = () => (
  <Wrapper>
    <div className="centered">
      <LoadingIndicator />
    </div>
  </Wrapper>
);

export default Loader;
