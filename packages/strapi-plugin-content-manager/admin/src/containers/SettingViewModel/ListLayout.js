import React, { Fragment, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
// import { DropTarget } from 'react-dnd';
import { useDrop } from 'react-dnd';

import { InputsIndex as Input } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import FormWrapper from '../../components/SettingFormWrapper';
import { Wrapper } from './components';
import Add from '../../components/AddDropdown';
import ListField from './ListField';

import ItemTypes from '../../utils/itemsTypes';

function ListLayout({
  addField,
  availableData,
  displayedData,
  fieldToEditIndex,
  modifiedData,
  moveListField,
  onChange,
  onClick,
  onRemove,
  onSubmit,
}) {
  const handleRemove = index => {
    if (displayedData.length > 1) {
      onRemove(index);
      return;
    }

    strapi.notification.info(`${pluginId}.notification.info.minimumFields`);
  };

  const fieldName = displayedData[fieldToEditIndex];
  const fieldPath = ['metadatas', fieldName, 'list'];

  const form = [
    {
      label: { id: 'content-manager.form.Input.label' },
      customBootstrapClass: 'col-md-7',
      didCheckErrors: false,
      errors: [],
      inputDescription: {
        id: 'content-manager.form.Input.label.inputDescription',
      },
      name: `${fieldPath.join('.')}.label`,
      type: 'string',
      validations: {},
    },
    {
      label: { id: 'content-manager.form.Input.sort.field' },
      customBootstrapClass: 'col-md-6',
      didCheckErrors: false,
      errors: [],
      name: `${fieldPath.join('.')}.sortable`,
      style: { marginTop: '18px' },
      type: 'toggle',
      validations: {},
    },
  ];

  const findField = useCallback(
    id => {
      const field = displayedData.filter(current => current === id)[0];

      return {
        field,
        index: displayedData.indexOf(field),
      };
    },
    [displayedData]
  );

  const move = useCallback(
    (id, atIndex) => {
      const { index } = findField(id);

      moveListField(index, atIndex);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayedData]
  );

  const [, drop] = useDrop({
    accept: ItemTypes.FIELD,
    collect: monitor => ({
      itemType: monitor.getItemType(),
    }),
  });

  return (
    <>
      <div className="col-lg-5 col-md-12" ref={drop}>
        {displayedData.map((data, index) => (
          <Fragment key={data}>
            <Wrapper>
              <div>{index + 1}.</div>
              <ListField
                findField={findField}
                index={index}
                isSelected={fieldToEditIndex === index}
                move={move}
                name={data}
                label={get(
                  modifiedData,
                  ['metadatas', data, 'list', 'label'],
                  ''
                )}
                onClick={onClick}
                onRemove={handleRemove}
              />
            </Wrapper>
            <div style={{ marginBottom: '6px' }}></div>
          </Fragment>
        ))}
        <Add data={availableData} onClick={addField} />
      </div>
      <div className="col-lg-7 col-md-12">
        <FormWrapper onSubmit={onSubmit}>
          {form.map(input => {
            return (
              <Input
                key={input.name}
                {...input}
                onChange={onChange}
                value={get(modifiedData, input.name)}
              />
            );
          })}
        </FormWrapper>
      </div>
    </>
  );
}

ListLayout.defaultProps = {
  addField: () => {},
  availableData: [],
  displayedData: [],
  fieldToEditIndex: 0,
  modifiedData: {},
  onChange: () => {},
  onClick: () => {},
  onRemove: () => {},
  onSubmit: () => {},
};

ListLayout.propTypes = {
  addField: PropTypes.func,
  availableData: PropTypes.array,
  displayedData: PropTypes.array,
  fieldToEditIndex: PropTypes.number,
  modifiedData: PropTypes.object,
  moveListField: PropTypes.func.isRequired,
  onChange: PropTypes.func,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  onSubmit: PropTypes.func,
};

export default ListLayout;

// export default DropTarget(ItemTypes.FIELD, {}, connect => ({
//   connectDropTarget: connect.dropTarget(),
// }))(ListLayout);
