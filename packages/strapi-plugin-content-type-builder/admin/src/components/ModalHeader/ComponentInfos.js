import React from 'react';
import PropTypes from 'prop-types';
import { get, upperFirst } from 'lodash';
import ComponentInfosWrapper from './ComponentInfosWrapper';
import useDataManager from '../../hooks/useDataManager';

const ComponentInfos = ({ uid }) => {
  // We might want to change to initialData...
  // @Aurelsicoko
  const { modifiedData } = useDataManager();
  const currentComponent = get(modifiedData, ['components', uid], {});
  const currentComponentCategory = get(currentComponent, 'category', '');
  const currentComponentFriendlyName = get(
    currentComponent,
    ['schema', 'name'],
    ''
  );

  return (
    <ComponentInfosWrapper>
      &nbsp; ({upperFirst(currentComponentCategory)}
      &nbsp;—&nbsp;
      {upperFirst(currentComponentFriendlyName)})
    </ComponentInfosWrapper>
  );
};

ComponentInfos.propTypes = {
  uid: PropTypes.string.isRequired,
};

export default ComponentInfos;
