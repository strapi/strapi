/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import IconRemove from '../../assets/images/icon_remove.svg';
import { Span } from './components';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

const Relation = ({ data, isDisabled, mainField, onRemove, to }) => {
  const cursor = isDisabled ? 'not-allowed' : 'pointer';
  const { pathname } = useLocation();

  return (
    <>
      <div style={{ cursor }}>
        <div className="dragHandle">
          <span />
        </div>
        <FormattedMessage id={`${pluginId}.containers.Edit.clickToJump`}>
          {title => (
            <Link to={{ pathname: to, state: { from: pathname } }} title={title}>
              <Span>{data[mainField]}</Span>
            </Link>
          )}
        </FormattedMessage>
      </div>
      <div style={{ cursor }}>
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
  isDisabled: PropTypes.bool.isRequired,
  mainField: PropTypes.string.isRequired,
  onRemove: PropTypes.func,
  to: PropTypes.string,
};

export default memo(Relation);
