import React, {
  memo,
  useContext,
  // useMemo,
  useReducer,
  // useState
} from 'react';
import PropTypes from 'prop-types';
import { useMutation } from 'react-query';
import {
  // get,
  pick,
} from 'lodash';
import { useNotification, useTracking } from '@strapi/helper-plugin';
// import { useIntl } from 'react-intl';
import { Box } from '@strapi/parts/Box';
import { Divider } from '@strapi/parts/Divider';
import ModelsContext from '../../contexts/ModelsContext';
import putCMSettingsLV from './utils/api';
import SettingsForm from './components/SettingsForm';
import DragWrapper from './components/DragWrapper';
// import LayoutDndProvider from '../../components/LayoutDndProvider';
import init from './init';
import reducer, { initialState } from './reducer';

const ListSettingsView = ({ layout, slug, updateLayout }) => {
  const toggleNotification = useNotification();
  const { refetchData } = useContext(ModelsContext);
  const [reducerState, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, layout)
  );
  // const [isOpen, setIsOpen] = useState(false);
  // const [isModalFormOpen, setIsModalFormOpen] = useState(false);
  // const [isDraggingSibling, setIsDraggingSibling] = useState(false);
  // const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  // const toggleModalForm = () => setIsModalFormOpen(prevState => !prevState);
  const {
    // labelForm,
    // labelToEdit,
    initialData,
    modifiedData,
  } = reducerState;
  // const metadatas = get(modifiedData, ['metadatas'], {});

  // const attributes = useMemo(() => {
  //   return get(modifiedData, ['attributes'], {});
  // }, [modifiedData]);

  const { attributes } = layout;

  // const displayedFields = useMemo(() => {
  //   return get(modifiedData, ['layouts', 'list'], []);
  // }, [modifiedData]);

  const excludedSortOptions = ['media', 'richtext', 'dynamiczone', 'relation', 'component', 'json'];

  const sortOptions = Object.entries(attributes).reduce((acc, cur) => {
    const [name, { type }] = cur;

    if (!excludedSortOptions.includes(type)) {
      acc.push(name);
    }

    return acc;
  }, []);

  // const listRemainingFields = useMemo(() => {
  //   return Object.keys(metadatas)
  //     .filter(key => {
  //       return checkIfAttributeIsDisplayable(get(attributes, key, {}));
  //     })
  //     .filter(field => {
  //       return !displayedFields.includes(field);
  //     })
  //     .sort();
  // }, [displayedFields, attributes, metadatas]);

  // console.log(displayedFields, listRemainingFields);

  // const handleClickEditLabel = labelToEdit => {
  //   dispatch({
  //     type: 'SET_LABEL_TO_EDIT',
  //     labelToEdit,
  //   });
  //   toggleModalForm();
  // };

  // const handleClosed = () => {
  //   dispatch({
  //     type: 'UNSET_LABEL_TO_EDIT',
  //   });
  // };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value: name === 'settings.pageSize' ? parseInt(value, 10) : value,
    });
  };

  // const handleChangeEditLabel = ({ target: { name, value } }) => {
  //   dispatch({
  //     type: 'ON_CHANGE_LABEL_METAS',
  //     name,
  //     value,
  //   });
  // };

  const handleConfirm = async () => {
    const body = pick(modifiedData, ['layouts', 'settings', 'metadatas']);
    submitMutation.mutateAsync(body);
  };

  const submitMutation = useMutation(body => putCMSettingsLV(body, slug), {
    onSuccess: async ({ data: { data } }) => {
      updateLayout(data);

      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });
      trackUsage('didEditListSettings');
      refetchData();
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    },
    refetchActive: true,
  });

  const { isLoading: isSubmittingForm } = submitMutation;

  // const move = (originalIndex, atIndex) => {
  //   dispatch({
  //     type: 'MOVE_FIELD',
  //     originalIndex,
  //     atIndex,
  //   });
  // };

  // const [, drop] = useDrop({ accept: ItemTypes.FIELD });

  // const renderForm = () => {
  //   const type = get(attributes, [labelToEdit, 'type'], 'text');
  //   const relationType = get(attributes, [labelToEdit, 'relationType']);
  //   let shouldDisplaySortToggle = !['media', 'relation'].includes(type);
  //   const label = formatMessage({ id: getTrad('form.Input.label') });
  //   const description = formatMessage({ id: getTrad('form.Input.label.inputDescription') });

  //   if (['oneWay', 'oneToOne', 'manyToOne'].includes(relationType)) {
  //     shouldDisplaySortToggle = true;
  //   }

  //   return (
  //     <>
  //       <div className="col-6" style={{ marginBottom: 4 }}>
  //         <Input
  //           description={description}
  //           label={label}
  //           type="text"
  //           name="label"
  //           onBlur={() => {}}
  //           value={get(labelForm, 'label', '')}
  //           onChange={handleChangeEditLabel}
  //         />
  //       </div>
  //       {shouldDisplaySortToggle && (
  //         <div className="col-6" style={{ marginBottom: 4 }}>
  //           <Input
  //             label={formatMessage({ id: getTrad('form.Input.sort.field') })}
  //             type="bool"
  //             name="sortable"
  //             value={get(labelForm, 'sortable', false)}
  //             onChange={handleChangeEditLabel}
  //           />
  //         </div>
  //       )}
  //     </>
  //   );
  // };

  return (
    <SettingsForm
      collectionName={modifiedData.info.label}
      initialData={initialData}
      isSubmittingForm={isSubmittingForm}
      modifiedData={modifiedData}
      onChange={handleChange}
      onConfirmSubmit={handleConfirm}
      refetchData={refetchData}
      sortOptions={sortOptions}
    >
      <Box padding={6}>
        <Divider />
      </Box>
      <DragWrapper />
    </SettingsForm>

    //     <LayoutDndProvider
    //       isDraggingSibling={isDraggingSibling}
    //       setIsDraggingSibling={setIsDraggingSibling}
    //     >
    //       <SettingsViewWrapper
    //         displayedFields={displayedFields}
    //         inputs={forms}
    //         isLoading={false}
    //         initialData={initialData}
    //         modifiedData={modifiedData}
    //         onChange={handleChange}
    //         onConfirmReset={() => {
    //           dispatch({
    //             type: 'ON_RESET',
    //           });
    //         }}
    //         onConfirmSubmit={handleConfirm}
    //         onModalConfirmClosed={refetchData}
    //         name={getName}
    //       >
    //         <DragWrapper>
    //           <div className="row">
    //             <div className="col-12">
    //               <SortWrapper
    //                 ref={drop}
    //                 style={{
    //                   display: 'flex',
    //                   width: '100%',
    //                 }}
    //               >
    //                 {displayedFields.map((item, index) => {
    //                   const label = get(modifiedData, ['metadatas', item, 'list', 'label'], '');

    //                   return (
    //                     <Label
    //                       count={displayedFields.length}
    //                       key={item}
    //                       index={index}
    //                       isDraggingSibling={isDraggingSibling}
    //                       label={label}
    //                       move={move}
    //                       name={item}
    //                       onClick={handleClickEditLabel}
    //                       onRemove={e => {
    //                         e.stopPropagation();

    //                         if (displayedFields.length === 1) {
    //                           toggleNotification({
    //                             type: 'info',
    //                             message: { id: getTrad('notification.info.minimumFields') },
    //                           });
    //                         } else {
    //                           dispatch({
    //                             type: 'REMOVE_FIELD',
    //                             index,
    //                           });
    //                         }
    //                       }}
    //                       selectedItem={labelToEdit}
    //                       setIsDraggingSibling={setIsDraggingSibling}
    //                     />
    //                   );
    //                 })}
    //               </SortWrapper>
    //             </div>
    //           </div>
    //           <DropdownButton
    //             isOpen={isOpen}
    //             toggle={() => {
    //               if (listRemainingFields.length > 0) {
    //                 setIsOpen(prevState => !prevState);
    //               }
    //             }}
    //             direction="down"
    //             style={{
    //               position: 'absolute',
    //               top: 11,
    //               right: 10,
    //             }}
    //           >
    //             <Toggle disabled={listRemainingFields.length === 0} />
    //             <MenuDropdown>
    //               {listRemainingFields.map(item => (
    //                 <DropdownItem
    //                   key={item}
    //                   onClick={() => {
    //                     dispatch({
    //                       type: 'ADD_FIELD',
    //                       item,
    //                     });
    //                   }}
    //                 >
    //                   {item}
    //                 </DropdownItem>
    //               ))}
    //             </MenuDropdown>
    //           </DropdownButton>
    //         </DragWrapper>
    //       </SettingsViewWrapper>
    //       <PopupForm
    //         headerId={getTrad('containers.ListSettingsView.modal-form.edit-label')}
    //         isOpen={isModalFormOpen}
    //         onClosed={handleClosed}
    //         onSubmit={e => {
    //           e.preventDefault();
    //           toggleModalForm();
    //           dispatch({
    //             type: 'SUBMIT_LABEL_FORM',
    //           });
    //         }}
    //         onToggle={toggleModalForm}
    //         renderForm={renderForm}
    //         subHeaderContent={labelToEdit}
    //         type={get(attributes, [labelToEdit, 'type'], 'text')}
    //       />
    //     </LayoutDndProvider>
  );
};

ListSettingsView.propTypes = {
  layout: PropTypes.shape({
    uid: PropTypes.string.isRequired,
    settings: PropTypes.object.isRequired,
    metadatas: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,
    attributes: PropTypes.object.isRequired,
  }).isRequired,
  slug: PropTypes.string.isRequired,
  updateLayout: PropTypes.func.isRequired,
};

export default memo(ListSettingsView);

// export default () => 'TODO ListSettingsView';
