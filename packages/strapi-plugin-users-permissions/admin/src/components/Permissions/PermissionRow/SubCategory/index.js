import React, { useCallback, useMemo } from 'react';
import { get } from 'lodash';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Flex, Padded, Text, Checkbox } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import CheckboxWrapper from '../CheckboxWrapper';
import BaselineAlignment from '../BaselineAlignment';
import SubCategoryWrapper from './SubCategoryWrapper';
import { useUsersPermissions } from '../../../../contexts/UsersPermissionsContext';
import PolicyWrapper from './PolicyWrapper';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid #f6f6f6;
  padding: 0px 10px;
`;

const SubCategory = ({ subCategory }) => {
  const {
    onChange,
    onChangeSelectAll,
    onSelectedAction,
    selectedAction,
    modifiedData,
  } = useUsersPermissions();

  const currentScopedModifiedData = useMemo(() => {
    return get(modifiedData, subCategory.testName, {});
  }, [modifiedData, subCategory]);

  const hasAllActionsSelected = useMemo(() => {
    return Object.values(currentScopedModifiedData).every(action => action.enabled === true);
  }, [currentScopedModifiedData]);

  const hasSomeActionsSelected = useMemo(() => {
    return (
      Object.values(currentScopedModifiedData).some(action => action.enabled === true) &&
      !hasAllActionsSelected
    );
  }, [currentScopedModifiedData, hasAllActionsSelected]);

  const handleChangeSelectAll = useCallback(
    ({ target: { name } }) => {
      onChangeSelectAll({ target: { name, value: !hasAllActionsSelected } });
    },
    [hasAllActionsSelected, onChangeSelectAll]
  );

  const handleSelectPolicy = actionName => {
    onSelectedAction(actionName);
  };

  const isActionSelected = useCallback(
    actionName => {
      return selectedAction === actionName;
    },
    [selectedAction]
  );

  return (
    <SubCategoryWrapper>
      <Flex justifyContent="space-between" alignItems="center">
        <Padded right size="sm">
          <Text
            lineHeight="18px"
            color="#919bae"
            fontWeight="bold"
            fontSize="xs"
            textTransform="uppercase"
          >
            {subCategory.name}
          </Text>
        </Padded>
        <Border />
        <Padded left size="sm">
          <BaselineAlignment />
          <Checkbox
            name={subCategory.testName}
            message="Select all"
            onChange={handleChangeSelectAll}
            someChecked={hasSomeActionsSelected}
            value={hasAllActionsSelected}
          />
        </Padded>
      </Flex>
      <BaselineAlignment />
      <Padded top size="xs">
        <Flex flexWrap="wrap">
          {subCategory.testActions.map(action => {
            const name = `${action.testName}.enabled`;

            return (
              <CheckboxWrapper isActive={isActionSelected(action.testName)} key={action.testName}>
                <Checkbox
                  value={get(modifiedData, name, false)}
                  name={name}
                  message={action.label}
                  onChange={onChange}
                />
                <PolicyWrapper onClick={() => handleSelectPolicy(action.testName)}>
                  <FontAwesomeIcon icon="cog" />
                </PolicyWrapper>
              </CheckboxWrapper>
            );
          })}
        </Flex>
      </Padded>
    </SubCategoryWrapper>
  );
};

SubCategory.propTypes = {
  subCategory: PropTypes.object.isRequired,
};

export default SubCategory;

// import React, { useCallback, useMemo } from 'react';
// import { without } from 'lodash';
// import styled from 'styled-components';
// import PropTypes from 'prop-types';
// import { Flex, Padded, Text, Checkbox } from '@buffetjs/core';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// import CheckboxWrapper from '../CheckboxWrapper';
// import BaselineAlignment from '../BaselineAlignment';
// import SubCategoryWrapper from './SubCategoryWrapper';
// import { useUsersPermissions } from '../../../../contexts/UsersPermissionsContext';
// import PolicyWrapper from './PolicyWrapper';

// const Border = styled.div`
//   flex: 1;
//   align-self: center;
//   border-top: 1px solid #f6f6f6;
//   padding: 0px 10px;
// `;

// const SubCategory = ({ subCategory }) => {
//   const {
//     onSelectedAction,
//     onSelectedPermission,
//     onSelectedSubcategory,
//     pluginName,
//     selectedAction,
//   } = useUsersPermissions();

//   const actions = useMemo(() => {
//     return Object.values(subCategory.actions).reduce((acc, curr, index) => {
//       return [
//         ...acc,
//         {
//           ...curr,
//           name: Object.keys(subCategory.actions)[index],
//         },
//       ];
//     }, []);
//   }, [subCategory]);

//   const handleSelectPermission = action => {
//     onSelectedPermission(`${pluginName}.controllers.${subCategory.name}.${action}`);
//   };

//   const selectedActions = useMemo(() => {
//     return actions.map(a => a.enabled).filter(Boolean);
//   }, [actions]);

//   const handleSelectPolicy = action => {
//     onSelectedAction(`${pluginName}.controllers.${subCategory.name}.${action}`);
//   };

//   const isActionSelected = useCallback(
//     action => {
//       const selectedActionArr = without(selectedAction.split('.'), 'controllers');

//       return (
//         selectedActionArr[0] === pluginName &&
//         selectedActionArr[1] === subCategory.name &&
//         selectedActionArr[2] === action
//       );
//     },
//     [pluginName, selectedAction, subCategory]
//   );

//   const hasAllCategoryActions = useMemo(() => {
//     return selectedActions.length === actions.length;
//   }, [actions, selectedActions]);

//   const hasSomeCategoryActions = useMemo(() => {
//     return selectedActions.length > 0 && selectedActions.length < actions.length;
//   }, [actions, selectedActions]);

//   const handleSubCategoryPermissions = useCallback(() => {
//     const shouldEnable = selectedActions.length < actions.length;

//     onSelectedSubcategory({
//       subcategoryPath: `${pluginName}.controllers.${subCategory.name}`,
//       shouldEnable,
//     });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [actions, pluginName, selectedActions, subCategory]);

//   return (
//     <SubCategoryWrapper>
//       <Flex justifyContent="space-between" alignItems="center">
//         <Padded right size="sm">
//           <Text
//             lineHeight="18px"
//             color="#919bae"
//             fontWeight="bold"
//             fontSize="xs"
//             textTransform="uppercase"
//           >
//             {subCategory.name}
//           </Text>
//         </Padded>
//         <Border />
//         <Padded left size="sm">
//           <BaselineAlignment />
//           <Checkbox
//             name={`select-all-${subCategory.name}`}
//             message="Select all"
//             onChange={handleSubCategoryPermissions}
//             someChecked={hasSomeCategoryActions}
//             value={hasAllCategoryActions}
//           />
//         </Padded>
//       </Flex>
//       <BaselineAlignment />
//       <Padded top size="xs">
//         <Flex flexWrap="wrap">
//           {actions.map(action => (
//             <CheckboxWrapper isActive={isActionSelected(action.name)} key={action.name}>
//               <Checkbox
//                 value={action.enabled}
//                 name={action.name}
//                 message={action.name}
//                 onChange={() => handleSelectPermission(action.name)}
//               />
//               <PolicyWrapper onClick={() => handleSelectPolicy(action.name)}>
//                 <FontAwesomeIcon icon="cog" />
//               </PolicyWrapper>
//             </CheckboxWrapper>
//           ))}
//         </Flex>
//       </Padded>
//     </SubCategoryWrapper>
//   );
// };

// SubCategory.propTypes = {
//   subCategory: PropTypes.object.isRequired,
// };

// export default SubCategory;
