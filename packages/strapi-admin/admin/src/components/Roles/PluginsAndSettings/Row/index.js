import React, { useMemo } from 'react';
import { Flex, Text } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { PermissionsWrapper, RowContainer } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import SubCategory from '../SubCategory';
import RowStyle from './Wrapper';

const PermissionRow = ({
  childrenForm,
  kind,
  name,
  isOpen,
  isFormDisabled,
  isWhite,
  onOpenCategory,
  pathToData,
}) => {
  const { formatMessage } = useIntl();

  const handleClick = () => {
    onOpenCategory(name);
  };

  const categoryName = useMemo(() => {
    const split = name.split('::');

    return split.pop();
  }, [name]);

  return (
    <RowContainer isWhite={isWhite}>
      <RowStyle isWhite={isWhite} isActive={isOpen} onClick={handleClick}>
        <Flex alignItems="center" justifyContent="space-between">
          <div>
            <Text color="grey" fontWeight="bold" fontSize="xs" textTransform="uppercase">
              {categoryName}
            </Text>
            <Text lineHeight="22px" color="grey">
              {formatMessage({ id: 'Settings.permissions.category' }, { category: categoryName })}
              &nbsp;{kind === 'plugins' ? 'plugin' : kind}
            </Text>
          </div>
          <div>
            <FontAwesomeIcon style={{ width: '11px' }} color="#9EA7B8" icon="chevron-down" />
          </div>
        </Flex>
      </RowStyle>

      {isOpen && (
        <PermissionsWrapper isWhite={isWhite}>
          {childrenForm.map(({ actions, subCategoryName, subCategoryId }) => (
            <SubCategory
              key={subCategoryName}
              actions={actions}
              categoryName={categoryName}
              isFormDisabled={isFormDisabled}
              subCategoryName={subCategoryName}
              pathToData={[...pathToData, subCategoryId]}
            />
          ))}
        </PermissionsWrapper>
      )}
    </RowContainer>
  );
};

PermissionRow.defaultProps = {};

PermissionRow.propTypes = {
  childrenForm: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  isWhite: PropTypes.bool.isRequired,
  kind: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onOpenCategory: PropTypes.func.isRequired,
  pathToData: PropTypes.array.isRequired,
};

export default PermissionRow;
