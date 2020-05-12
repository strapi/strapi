import React from 'react';
import styled from 'styled-components';

import IntlText from '../IntlText';

const ListTitle = styled(props => <IntlText fontSize="md" fontWeight="bold" {...props} />)`
  margin-bottom: 3px;
`;

export default ListTitle;
