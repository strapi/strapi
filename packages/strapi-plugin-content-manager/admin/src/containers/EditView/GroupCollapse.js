import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import { DragSource, DropTarget } from 'react-dnd';
import { Collapse } from 'reactstrap';

import pluginId from '../../pluginId';
import SelectWrapper from '../../components/SelectWrapper';

import ItemTypes from '../../utils/itemsTypes';
import Grab from '../../assets/images/grab_icon.svg';
import Logo from '../../assets/images/caret_top.svg';

import { Flex, GroupCollapseWrapper, ImgWrapper } from './components';
import Inputs from './Inputs';

function GroupCollapse({
  addRelation,
  connectDragSource,
  connectDropTarget,
  isCreating,
  isDragging,
  isOpen,
  layout,
  modifiedData,
  name,
  onChange,
  onClick,
  pathname,
  search,
  removeField,
}) {
  const id = isCreating
    ? { id: `${pluginId}.containers.Edit.pluginHeader.title.new` }
    : {};
  const fields = get(layout, ['layouts', 'edit'], []);
  const ref = React.useRef(null);
  const opacity = isDragging ? 0.2 : 1;

  connectDragSource(ref);
  connectDropTarget(ref);
  console.log('f', { pathname, search });

  return (
    <>
      <GroupCollapseWrapper onClick={onClick} ref={ref} style={{ opacity }}>
        <Flex style={{ fontWeight: 500 }}>
          <ImgWrapper isOpen={isOpen}>
            <img src={Logo} alt="logo" />
          </ImgWrapper>
          <FormattedMessage {...id} />
        </Flex>
        <Flex>
          <button
            type="button"
            style={{ marginRight: 8 }}
            onClick={removeField}
          >
            <i className="fa fa-trash" />
          </button>
          <button type="button" style={{ lineHeigth: '32px' }}>
            <img src={Grab} alt="grab icon" />
          </button>
        </Flex>
      </GroupCollapseWrapper>
      <Collapse isOpen={isOpen}>
        <div style={{ paddingTop: '25px' }}>
          {fields.map((fieldRow, key) => {
            return (
              <div className="row" key={key}>
                {fieldRow.map(field => {
                  //
                  const currentField = get(
                    layout,
                    ['schema', 'attributes', field.name],
                    ''
                  );
                  const currentFieldMeta = get(
                    layout,
                    ['metadata', field.name, 'edit'],
                    {}
                  );

                  if (currentField.type === 'relation') {
                    return (
                      <div className="col-6" key={`${name}.${field.name}`}>
                        <SelectWrapper
                          {...currentFieldMeta}
                          addRelation={addRelation}
                          name={`${name}.${field.name}`}
                          key={`${name}.${field.name}`}
                          onChange={onChange}
                          pathname={pathname}
                          search={search}
                          relationType={currentField.relationType}
                          targetModel={currentField.targetModel}
                          value={get(modifiedData, `${name}.${field.name}`)}
                        />
                      </div>
                    );
                  }

                  return (
                    <Inputs
                      key={`${name}.${field.name}`}
                      layout={layout}
                      modifiedData={modifiedData}
                      keys={`${name}.${field.name}`}
                      name={`${field.name}`}
                      onChange={({ target: { value } }) => {
                        onChange({
                          target: {
                            name: `${name}.${field.name}`,
                            value,
                          },
                        });
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </Collapse>
    </>
  );
}

GroupCollapse.defaultProps = {
  addRelation: () => {},
  isCreating: true,
  isDragging: false,
  isOpen: false,
  layout: {},
  move: () => {},
  removeField: () => {},
};

GroupCollapse.propTypes = {
  addRelation: PropTypes.func,
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isCreating: PropTypes.bool,
  isDragging: PropTypes.bool,
  isOpen: PropTypes.bool,
  layout: PropTypes.object,
  modifiedData: PropTypes.object,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  pathname: PropTypes.string.isRequired,
  removeField: PropTypes.func,
  search: PropTypes.string.isRequired,
};

export default DropTarget(
  ItemTypes.GROUP,
  {
    canDrop: () => true,
    hover(props, monitor) {
      const { id: draggedId } = monitor.getItem();
      const { id: overId } = props;

      if (draggedId !== overId) {
        const { index: overIndex } = props.findField(overId);
        props.move(draggedId, overIndex, props.groupName);
      }
    },
  },
  connect => ({
    connectDropTarget: connect.dropTarget(),
  })
)(
  DragSource(
    ItemTypes.GROUP,
    {
      beginDrag: props => {
        props.collapseAll();

        return {
          id: props.id,
          originalIndex: props.findField(props.id).index,
        };
      },

      endDrag(props, monitor) {
        const { id: droppedId, originalIndex } = monitor.getItem();
        const didDrop = monitor.didDrop();

        if (!didDrop) {
          props.move(droppedId, originalIndex, props.groupName);
        }
      },
    },
    (connect, monitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
    })
  )(GroupCollapse)
);
