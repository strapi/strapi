import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import { Collapse } from 'reactstrap';
import pluginId from '../../pluginId';
import Grab from '../../assets/images/grab_icon.svg';
import Logo from '../../assets/images/caret_top.svg';
import { Flex, GroupCollapseWrapper, ImgWrapper } from './components';
import Inputs from './Inputs';

function GroupCollapse({
  isCreating,
  isOpen,
  layout,
  modifiedData,
  onChange,
  name,
  onClick,
  removeField,
}) {
  const id = isCreating
    ? { id: `${pluginId}.containers.Edit.pluginHeader.title.new` }
    : {};
  const fields = get(layout, ['layouts', 'edit'], []);

  return (
    <>
      <GroupCollapseWrapper onClick={onClick}>
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
  isCreating: true,
  isOpen: false,
  layout: {},
  removeField: () => {},
};

GroupCollapse.propTypes = {
  isCreating: PropTypes.bool,
  isOpen: PropTypes.bool,
  layout: PropTypes.object,
  modifiedData: PropTypes.object,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  removeField: PropTypes.func,
};

export default GroupCollapse;
