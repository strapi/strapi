import React from 'react';
import { FormattedMessage } from 'react-intl';
import getTrad from '../../utils/getTrad';

const App = () => {
  return <FormattedMessage id={getTrad('plugin.name')} defaultMessage="My plugin" />;
};

export default App;
