import React, { useMemo } from 'react';
import { Flex, Text } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import getTrad from '../../../utils/getTrad';
import SubCategory from './SubCategory';
import RowStyle from './RowStyle';
import PermissionsWrapper from './PermissionsWrapper';

const PermissionRow = ({ isOpen, isWhite, name, onOpenPlugin, permissions }) => {
  const { formatMessage } = useIntl();

  const subCategories = useMemo(() => {
    // Avoid computing when not necesserary
    if (!isOpen) {
      return [];
    }

    return Object.values(permissions.controllers).reduce((acc, curr, index) => {
      const testName = `${name}.controllers.${Object.keys(permissions.controllers)[index]}`;
      const actions = Object.keys(curr).reduce((acc, current) => {
        return [
          ...acc,
          {
            ...curr[current],
            name: current,
            label: current,
            testName: `${testName}.${current}`,
          },
        ];
      }, []);

      return [
        ...acc,
        {
          actions: curr,
          testActions: actions,
          testName,
          name: Object.keys(permissions.controllers)[index],
          // TODO:
        },
      ];
    }, []);
  }, [isOpen, name, permissions]);

  return (
    <>
      <RowStyle isActive={isOpen} isWhite={isWhite} onClick={onOpenPlugin}>
        <Flex alignItems="center" justifyContent="space-between">
          <div>
            <Text color="grey" fontWeight="bold" fontSize="xs" textTransform="uppercase">
              {name}
            </Text>
            <Text lineHeight="22px" color="grey">
              {formatMessage({ id: getTrad('Plugin.permissions.plugins.description') }, { name })}
            </Text>
          </div>
          <div>
            <FontAwesomeIcon
              style={{ width: '11px' }}
              color="#9EA7B8"
              icon={isOpen ? 'chevron-up' : 'chevron-down'}
            />
          </div>
        </Flex>
      </RowStyle>
      {isOpen && (
        <PermissionsWrapper>
          {subCategories.map(subCategory => (
            <SubCategory key={subCategory.name} subCategory={subCategory} />
          ))}
        </PermissionsWrapper>
      )}
    </>
  );
};

PermissionRow.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isWhite: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onOpenPlugin: PropTypes.func.isRequired,
  permissions: PropTypes.object.isRequired,
};

export default PermissionRow;

// import React, { useMemo } from 'react';
// import { Flex, Text } from '@buffetjs/core';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import PropTypes from 'prop-types';
// import { useIntl } from 'react-intl';

// import getTrad from '../../../utils/getTrad';
// import SubCategory from './SubCategory';
// import RowStyle from './RowStyle';
// import PermissionsWrapper from './PermissionsWrapper';

// const PermissionRow = ({ openedPlugin, onOpenPlugin, permissions, isWhite, permissionType }) => {
//   const { formatMessage } = useIntl();

//   const subCategories = useMemo(() => {
//     return Object.values(permissions.controllers).reduce((acc, curr, index) => {
//       return [
//         ...acc,
//         {
//           actions: curr,
//           name: Object.keys(permissions.controllers)[index],
//         },
//       ];
//     }, []);
//   }, [permissions]);

//   console.log({ permissions, permissionType });

//   return (
//     <>
//       <RowStyle
//         isWhite={isWhite}
//         isActive={openedPlugin === permissions.name}
//         key={permissions.name}
//         onClick={onOpenPlugin}
//       >
//         <Flex alignItems="center" justifyContent="space-between">
//           <div>
//             <Text color="grey" fontWeight="bold" fontSize="xs" textTransform="uppercase">
//               {permissions.name}
//             </Text>
//             <Text lineHeight="22px" color="grey">
//               {formatMessage(
//                 { id: getTrad('Plugin.permissions.plugins.description') },
//                 { name: permissions.name }
//               )}
//               &nbsp;{permissionType}
//             </Text>
//           </div>
//           <div>
//             <FontAwesomeIcon
//               style={{ width: '11px' }}
//               color="#9EA7B8"
//               icon={openedPlugin === permissions.name ? 'chevron-up' : 'chevron-down'}
//             />
//           </div>
//         </Flex>
//       </RowStyle>
//       {openedPlugin === permissions.name && (
//         <PermissionsWrapper>
//           {subCategories.map(subCategory => (
//             <SubCategory key={subCategory.name} subCategory={subCategory} />
//           ))}
//         </PermissionsWrapper>
//       )}
//     </>
//   );
// };

// PermissionRow.defaultProps = {
//   openedPlugin: null,
//   permissionType: null,
// };
// PermissionRow.propTypes = {
//   openedPlugin: PropTypes.string,
//   onOpenPlugin: PropTypes.func.isRequired,
//   permissions: PropTypes.object.isRequired,
//   isWhite: PropTypes.bool.isRequired,
//   permissionType: PropTypes.string,
// };

// export default PermissionRow;
