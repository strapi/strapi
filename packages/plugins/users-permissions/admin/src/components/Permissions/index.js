import React, { memo, useReducer } from 'react';
import { Accordion, AccordionToggle, AccordionContent, Box } from '@strapi/parts';
import { useUsersPermissions } from '../../contexts/UsersPermissionsContext';
// import PermissionRow from './PermissionRow';
import init from './init';
import { initialState, reducer } from './reducer';

const Permissions = () => {
  const { modifiedData } = useUsersPermissions();
  const [{ collapses }] = useReducer(reducer, initialState, state =>
    init(state, modifiedData)
  );

  console.log(collapses);

  // const handleOpenPlugin = useCallback(index => {
  //   dispatch({
  //     type: 'TOGGLE_COLLAPSE',
  //     index,
  //   });
  // }, []);

  return (
    <>
      {collapses.map((collapse, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <Accordion expanded={false} toggle={() => {}} id="lol" key={`accordion-${index}`}>
          <AccordionToggle
            title="title"
            description="description"
            variant={index % 2 ? "primary" : "secondary"}
          />
          <AccordionContent>
            <Box padding={6}>
              <p>Accordion content</p>
            </Box>
          </AccordionContent>
        </Accordion>
      ))}
    </>
  );

  // return (
  //   <ListWrapper>
  //     <Padded left right size="sm">
  //       {collapses.map((_, index) => {
  //         const { isOpen, name } = collapses[index];

  //         return (
  //           <PermissionRow
  //             key={name}
  //             isOpen={isOpen}
  //             isWhite={index % 2 === 1}
  //             name={name}
  //             onOpenPlugin={() => handleOpenPlugin(index)}
  //             permissions={modifiedData[name]}
  //           />
  //         );
  //       })}
  //     </Padded>
  //   </ListWrapper>
  // );
};

export default memo(Permissions);
