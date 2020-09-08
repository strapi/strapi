import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { get } from 'lodash';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import useDataManager from '../../hooks/useDataManager';
import Wrapper from './Wrapper';

const RelationTargetPicker = ({ onChange, oneThatIsCreatingARelationWithAnother, target }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { contentTypes, sortedContentTypesList } = useDataManager();
  const allowedContentTypesForRelation = useMemo(
    () =>
      sortedContentTypesList
        .filter(obj => obj.kind === 'collectionType')
        .filter(
          obj =>
            obj.restrictRelationsTo === null ||
            (Array.isArray(obj.restrictRelationsTo) && obj.restrictRelationsTo.length > 0)
        ),
    [sortedContentTypesList]
  );

  const targetFriendlyName = get(contentTypes, [target, 'schema', 'name'], 'error');

  return (
    <Wrapper>
      <Dropdown
        isOpen={isOpen}
        toggle={() => {
          setIsOpen(!isOpen);
        }}
      >
        <DropdownToggle caret>
          <p>
            <FontAwesomeIcon
              icon={['far', 'caret-square-right']}
              style={{ fontSize: 12, marginTop: '-3px' }}
            />
            {targetFriendlyName}
          </p>
        </DropdownToggle>
        <DropdownMenu style={{ paddingTop: '3px' }}>
          {allowedContentTypesForRelation.map(({ uid, title, restrictRelationsTo }) => {
            return (
              <DropdownItem
                key={uid}
                onClick={() => {
                  // Change the target
                  onChange({
                    target: {
                      name: 'target',
                      value: uid,
                      type: 'relation',
                      oneThatIsCreatingARelationWithAnother,
                      selectedContentTypeFriendlyName: title,
                      targetContentTypeAllowedRelations: restrictRelationsTo,
                    },
                  });
                }}
              >
                <p>
                  <FontAwesomeIcon
                    icon={['far', 'caret-square-right']}
                    style={{ fontSize: 12, marginTop: '-3px' }}
                  />
                  {title}
                </p>
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    </Wrapper>
  );
};

RelationTargetPicker.propTypes = {
  onChange: PropTypes.func.isRequired,
  oneThatIsCreatingARelationWithAnother: PropTypes.string.isRequired,
  target: PropTypes.string.isRequired,
};

export default RelationTargetPicker;
