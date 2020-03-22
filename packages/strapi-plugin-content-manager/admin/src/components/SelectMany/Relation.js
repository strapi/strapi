/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import IconRemove from '../../assets/images/icon_remove.svg';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

const Relation = ({ data, mainField, onRemove, to }) => {
  return (
    <>
      <div style={{ cursor: 'pointer' }}>
        <div className="dragHandle">
          <span />
        </div>
        <FormattedMessage id={`${pluginId}.containers.Edit.clickToJump`}>
          {title => (
            <Link to={to} title={title}>
              <span>{data[mainField]}</span>
            </Link>
          )}
        </FormattedMessage>
      </div>
      <div style={{ cursor: 'pointer' }}>
        <img src={IconRemove} alt="Remove Icon" onClick={onRemove} />
      </div>
    </>
  );
};

Relation.defaultProps = {
  onRemove: () => {},
  to: '',
};

Relation.propTypes = {
  data: PropTypes.object.isRequired,
  mainField: PropTypes.string.isRequired,
  onRemove: PropTypes.func,
  to: PropTypes.string,
};

export default memo(Relation);
