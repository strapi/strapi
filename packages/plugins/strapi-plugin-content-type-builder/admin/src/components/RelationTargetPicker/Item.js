import React, { memo } from 'react';
import { DropdownItem } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';

const Item = ({
  onChange,
  oneThatIsCreatingARelationWithAnother,
  plugin,
  restrictRelationsTo,
  title,
  uid,
}) => {
  const handleChange = () => {
    const selectedContentTypeFriendlyName = plugin ? `${plugin}_${title}` : title;

    onChange({
      target: {
        name: 'target',
        value: uid,
        type: 'relation',
        oneThatIsCreatingARelationWithAnother,
        selectedContentTypeFriendlyName,
        targetContentTypeAllowedRelations: restrictRelationsTo,
      },
    });
  };

  return (
    <DropdownItem key={uid} onClick={handleChange}>
      <p>
        <FontAwesomeIcon
          icon={['far', 'caret-square-right']}
          style={{ fontSize: 12, marginTop: '-3px' }}
        />
        {title}
        {plugin && (
          <Text as="span" fontStyle="italic" textTransform="none" color="rgba(50,55,64,0.75)">
            &nbsp; (from: {plugin})
          </Text>
        )}
      </p>
    </DropdownItem>
  );
};

Item.defaultProps = {
  plugin: null,
  restrictRelationsTo: null,
};

Item.propTypes = {
  onChange: PropTypes.func.isRequired,
  oneThatIsCreatingARelationWithAnother: PropTypes.string.isRequired,
  plugin: PropTypes.string,
  restrictRelationsTo: PropTypes.array,
  title: PropTypes.string.isRequired,
  uid: PropTypes.string.isRequired,
};

export default memo(Item);
