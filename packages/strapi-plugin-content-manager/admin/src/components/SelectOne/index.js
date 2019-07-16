import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { get, isEmpty, isNull } from 'lodash';
import { request } from 'strapi-helper-plugin';
import Select from 'react-select';

import pluginId from '../../pluginId';

import { Nav, Wrapper } from './components';

function SelectOne({
  description,
  label,
  mainField,
  name,
  onChange,
  pathname,
  search,
  targetModel,
  plugin,
  value,
}) {
  const [state, setState] = useState({
    _q: '',
    _limit: 8,
    _start: 0,
    source: isEmpty(plugin) ? 'content-manager' : plugin,
  });
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const ref = useRef();

  ref.current = async (uid, params = state) => {
    try {
      const requestUrl = `/${pluginId}/explorer/${uid}`;

      if (isEmpty(params._q)) {
        delete params._q;
      }

      const data = await request(requestUrl, {
        method: 'GET',
        params: params,
      });

      setOptions(
        data.map(obj => {
          return { value: obj, label: obj[mainField] };
        })
      );
      setIsLoading(false);
    } catch (err) {
      console.log({ err });

      strapi.notification.error('notification.error');
    }
  };

  useEffect(() => {
    ref.current(targetModel);
  }, [ref, targetModel, state._start]);

  const nextSearch = `${pathname}${search}`;
  const to = `/plugins/${pluginId}/${targetModel}/${
    value ? value.id : null
  }?redirectUrl=${nextSearch}`;
  const link =
    value === null ||
    value === undefined ||
    ['role', 'permission'].includes(targetModel) ? null : (
      <Link to={to}>
        <FormattedMessage id="content-manager.containers.Edit.seeDetails" />
      </Link>
    );

  const onInputChange = inputValue => {
    setState(prevState => ({ ...prevState, _q: inputValue }));

    return inputValue;
  };

  const onMenuScrollToBottom = () => {
    setState(prevState => ({ ...prevState, _start: prevState._start + 1 }));
  };

  return (
    <Wrapper className="form-group">
      <Nav>
        <label htmlFor={name}>{label}</label>
        {link}
      </Nav>
      {!isEmpty(description) && <p>{description}</p>}
      <Select
        id={name}
        isLoading={isLoading}
        isClearable
        options={options}
        onChange={value => {
          onChange({ target: { name, value: value ? value.value : value } });
        }}
        onInputChange={onInputChange}
        onMenuClose={() => {
          setState(prevState => ({ ...prevState, _start: 0 }));
        }}
        onMenuScrollToBottom={onMenuScrollToBottom}
        value={
          isNull(value) ? null : { label: get(value, [mainField], ''), value }
        }
      />
    </Wrapper>
  );
}

SelectOne.defaultProps = {
  description: '',
  label: '',
  plugin: '',
  value: null,
};

SelectOne.propTypes = {
  description: PropTypes.string,
  label: PropTypes.string,
  mainField: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  pathname: PropTypes.string.isRequired,
  plugin: PropTypes.string,
  search: PropTypes.string.isRequired,
  targetModel: PropTypes.string.isRequired,
  value: PropTypes.object,
};

export default SelectOne;
