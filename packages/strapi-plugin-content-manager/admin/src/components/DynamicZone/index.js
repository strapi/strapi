import React, { memo, useState } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import useDataManager from '../../hooks/useDataManager';
import Button from './Button';
import Wrapper from './Wrapper';

const DynamicZone = ({ name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { allLayoutData, layout } = useDataManager();
  const dynamicZoneAvailableComponents = get(
    layout,
    ['schema', 'attributes', name, 'components'],
    []
  );
  console.log({ allLayoutData, dynamicZoneAvailableComponents });

  return (
    <>
      Dynamic components data here
      <Wrapper>
        <Button
          isOpen={isOpen}
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
        >
          X
        </Button>
      </Wrapper>
    </>
  );
};

DynamicZone.propTypes = {
  name: PropTypes.string.isRequired,
};

export { DynamicZone };
export default memo(DynamicZone);
