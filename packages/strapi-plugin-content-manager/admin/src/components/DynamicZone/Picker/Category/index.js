import React, { memo, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import DynamicComponentCard from '../../../DynamicComponentCard';
import Banner from './Banner';

const Category = ({ category, components, isFirst, isOpen, onAddComponent, onToggle }) => {
  const [showComponents, setShowComponents] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowComponents(true);
    }
  }, [isOpen]);

  const handleExited = () => setShowComponents(false);

  return (
    <>
      <Banner isFirst={isFirst} isOpen={isOpen} category={category} onToggle={onToggle} />
      <Collapse isOpen={isOpen} onExited={handleExited}>
        {showComponents && (
          <div className="componentsList">
            {components.map(({ componentUid, info: { name, icon } }) => {
              return (
                <DynamicComponentCard
                  key={componentUid}
                  componentUid={componentUid}
                  friendlyName={name}
                  icon={icon}
                  onClick={() => {
                    onAddComponent(componentUid);
                  }}
                />
              );
            })}
          </div>
        )}
      </Collapse>
    </>
  );
};

Category.propTypes = {
  category: PropTypes.string.isRequired,
  components: PropTypes.array.isRequired,
  isFirst: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onAddComponent: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default memo(Category);
