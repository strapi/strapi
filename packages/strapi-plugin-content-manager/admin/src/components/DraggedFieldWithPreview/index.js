import React, { forwardRef, useState } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import Carret from './Carret';
import DraggedField from '../DraggedField';
import PreviewCarret from '../PreviewCarret';
import Wrapper from './Wrapper';

// eslint-disable-next-line react/display-name
const DraggedFieldWithPreview = forwardRef(
  (
    {
      goTo,
      groupUid,
      groupLayouts,
      isDragging,
      isDraggingSibling,
      label,
      name,
      onClickEdit,
      onClickRemove,
      selectedItem,
      showLeftCarret,
      showRightCarret,
      size,
      style,
      type,
    },
    refs
  ) => {
    const isHidden = name === '_TEMP_';
    const [dragStart, setDragStart] = useState(false);
    const opacity = isDragging ? 0.2 : 1;
    const isFullSize = size === 12;
    const display = isFullSize && dragStart ? 'none' : '';
    const width = isFullSize && dragStart ? 0 : '100%';
    const higherFields = ['json', 'text', 'file', 'media', 'group', 'richtext'];
    const withLongerHeight = higherFields.includes(type) && !dragStart;

    const groupData = get(groupLayouts, [groupUid], {});
    const groupLayout = get(groupData, ['layouts', 'edit'], []);
    const getWrapperWitdh = colNum => `${(1 / 12) * colNum * 100}%`;

    return (
      <div
        style={{ width: getWrapperWitdh(size) }}
        onDrag={() => {
          if (isFullSize && !dragStart) {
            setDragStart(true);
          }
        }}
        onDragEnd={() => {
          if (isFullSize) {
            setDragStart(false);
          }
        }}
      >
        <Wrapper
          ref={refs.dropRef}
          withLongerHeight={withLongerHeight}
          style={style}
        >
          {dragStart && isFullSize && (
            <PreviewCarret style={{ marginRight: '-10px' }} />
          )}
          <>
            {showLeftCarret && <Carret />}

            <div className="sub" style={{ width, opacity }}>
              <DraggedField
                goTo={goTo}
                groupUid={groupUid}
                isHidden={isHidden}
                isDraggingSibling={isDraggingSibling}
                label={label}
                name={name}
                onClick={onClickEdit}
                onRemove={onClickRemove}
                ref={refs.dragRef}
                selectedItem={selectedItem}
                style={{ display, marginRight: 0, paddingRight: 0 }}
                type={type}
                withLongerHeight={withLongerHeight}
              >
                {type === 'group' &&
                  groupLayout.map((row, i) => {
                    const marginBottom =
                      i === groupLayout.length - 1 ? '29px' : '';
                    const marginTop = i === 0 ? '5px' : '';

                    return (
                      <div
                        style={{
                          display: 'flex',
                          marginBottom,
                          marginTop,
                        }}
                        key={i}
                      >
                        {row.map(field => {
                          const fieldType = get(
                            groupData,
                            ['schema', 'attributes', field.name, 'type'],
                            ''
                          );
                          const label = get(
                            groupData,
                            ['metadatas', field.name, 'edit', 'label'],
                            ''
                          );

                          return (
                            <div
                              key={field.name}
                              style={{
                                width: getWrapperWitdh(field.size),
                                marginBottom: '6px',
                              }}
                            >
                              <DraggedField
                                label={label}
                                name={field.name}
                                isSub
                                withLongerHeight={higherFields.includes(
                                  fieldType
                                )}
                              ></DraggedField>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </DraggedField>
            </div>
            {showRightCarret && <Carret right />}
          </>
        </Wrapper>
      </div>
    );
  }
);

DraggedFieldWithPreview.defaultProps = {
  goTo: () => {},
  groupLayouts: {},
  groupUid: null,
  isDragging: false,
  isDraggingSibling: false,
  label: '',
  onClickEdit: () => {},
  onClickRemove: () => {},
  selectedItem: '',
  showLeftCarret: false,
  showRightCarret: false,
  size: 1,
  style: {},
  type: 'string',
};

DraggedFieldWithPreview.propTypes = {
  goTo: PropTypes.func,
  groupLayouts: PropTypes.object,
  groupUid: PropTypes.string,
  isDragging: PropTypes.bool,
  isDraggingSibling: PropTypes.bool,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onClickEdit: PropTypes.func,
  onClickRemove: PropTypes.func,
  selectedItem: PropTypes.string,
  showLeftCarret: PropTypes.bool,
  showRightCarret: PropTypes.bool,
  size: PropTypes.number,
  style: PropTypes.object,
  type: PropTypes.string,
};

export default DraggedFieldWithPreview;
