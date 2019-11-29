import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { get, upperFirst } from 'lodash';
import useDataManager from '../../hooks/useDataManager';
import ComponentInfos from './ComponentInfos';
import IconWrapper from './IconWrapper';

const Header = ({ category, name, target, targetUid }) => {
  const { modifiedData } = useDataManager();
  const currentComponent = get(modifiedData, ['components', targetUid], {});
  const currentComponentCategory = get(currentComponent, 'category', '');
  const currentComponentFriendlyName = get(
    currentComponent,
    ['schema', 'name'],
    ''
  );
  const componentInfos = (
    <>
      <ComponentInfos>
        &nbsp; ({upperFirst(currentComponentCategory)}
        &nbsp;—&nbsp;
        {upperFirst(currentComponentFriendlyName)})
      </ComponentInfos>
    </>
  );
  const shouldDisplayComponentCatInfos = target === 'components';

  const content = (
    <>
      <span>{upperFirst(category)}</span>
      <IconWrapper>
        <FontAwesomeIcon icon="chevron-right" />
      </IconWrapper>
    </>
  );

  return (
    <>
      {category && content}
      <span>{upperFirst(name)}</span>
      {shouldDisplayComponentCatInfos && componentInfos}
    </>
  );
};

Header.defaultProps = {
  category: null,
  name: null,
  target: null,
  targetUid: null,
};

Header.propTypes = {
  category: PropTypes.string,
  name: PropTypes.string,
  target: PropTypes.string,
  targetUid: PropTypes.string,
};

export default Header;
