import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import Banner from './Banner';
import ComponentsList from './ComponentsList';
import DynamicComponentCard from '../DynamicComponentCard';

const CategoryItem = ({
  category,
  components,
  isOpen,
  isFirst,
  onClickToggle,
  onClickComponent,
}) => {
  const [showComponents, setShowComponents] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setShowComponents(true);
    }
  }, [isOpen]);

  const handleExited = () => setShowComponents(false);

  return (
    <>
      <Banner onClickToggle={onClickToggle} isFirst={isFirst} isOpen={isOpen} category={category} />
      <Collapse isOpen={isOpen} onExited={handleExited}>
        {showComponents && (
          <ComponentsList className="componentsList">
            {components.map(component => {
              const {
                info: { icon, name: friendlyName },
                componentUid,
              } = component;

              return (
                <DynamicComponentCard
                  key={componentUid}
                  componentUid={componentUid}
                  friendlyName={friendlyName}
                  icon={icon}
                  onClick={() => {
                    onClickComponent(componentUid);
                  }}
                />
              );
            })}
          </ComponentsList>
        )}
      </Collapse>
    </>
  );
};

CategoryItem.propTypes = {
  category: PropTypes.string.isRequired,
  components: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  isFirst: PropTypes.bool.isRequired,
  onClickToggle: PropTypes.func.isRequired,
  onClickComponent: PropTypes.func.isRequired,
};

export default CategoryItem;
