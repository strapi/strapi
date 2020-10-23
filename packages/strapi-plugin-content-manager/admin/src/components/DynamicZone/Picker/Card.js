import React, { memo, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

import { useContentTypeLayout } from '../../../hooks';
import DynamicComponentCard from '../../DynamicComponentCard';

const Card = ({ componentUid, onClick }) => {
  const { getComponentLayout } = useContentTypeLayout();
  const { name, icon } = useMemo(() => {
    const {
      schema: {
        info: { icon, name },
      },
    } = getComponentLayout(componentUid);

    return { icon, name };
  }, [componentUid, getComponentLayout]);

  const handleClick = useCallback(() => {
    onClick(componentUid);
  }, [componentUid, onClick]);

  return (
    <DynamicComponentCard
      componentUid={componentUid}
      friendlyName={name}
      icon={icon}
      onClick={handleClick}
    />
  );
};

Card.propTypes = {
  componentUid: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default memo(Card);
