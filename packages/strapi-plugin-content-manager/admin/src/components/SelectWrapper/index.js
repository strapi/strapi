import React, { useState, useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { isEmpty } from 'lodash';
import { request } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import { useEditView } from '../../contexts/EditView';

import SelectOne from '../SelectOne';
import SelectMany from '../SelectMany';
import { Nav, Wrapper } from './components';

function SelectWrapper({
  label,
  mainField,
  name,
  relationType,
  targetModel,
  plugin,
  value,
}) {
  const {
    addRelation,
    moveRelation,
    onChange,
    onRemove,
    pathname,
    search,
  } = useEditView();
  const [state, setState] = useState({
    _q: '',
    _limit: 8,
    _start: 0,
    source: isEmpty(plugin) ? 'content-manager' : plugin,
  });
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const ref = useRef();
  const startRef = useRef();
  startRef.current = state._start;

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
      const formattedData = data.map(obj => {
        return { value: obj, label: obj[mainField] };
      });

      if (!isEmpty(params._q)) {
        setOptions(formattedData);

        return;
      }

      setOptions(prevState =>
        prevState.concat(formattedData).filter((obj, index) => {
          const objIndex = prevState.findIndex(
            el => el.value.id === obj.value.id
          );

          if (objIndex === -1) {
            return true;
          }
          return (
            prevState.findIndex(el => el.value.id === obj.value.id) === index
          );
        })
      );
      setIsLoading(false);
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  useEffect(() => {
    ref.current(targetModel);

    return () => {};
  }, [ref, targetModel, state._start, state._q]);

  const onInputChange = inputValue => {
    setState(prevState => {
      if (prevState._q === inputValue) {
        return prevState;
      }

      return { ...prevState, _q: inputValue };
    });

    return inputValue;
  };

  const onMenuScrollToBottom = () => {
    setState(prevState => ({ ...prevState, _start: prevState._start + 1 }));
  };
  const isSingle = [
    'oneWay',
    'oneToOne',
    'manyToOne',
    'oneToManyMorph',
    'oneToOneMorph',
  ].includes(relationType);
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
  const Component = isSingle ? SelectOne : SelectMany;

  return (
    <Wrapper className="form-group">
      <Nav>
        <label htmlFor={name}>{label}</label>
        {isSingle && link}
      </Nav>
      <Component
        addRelation={value => {
          addRelation({ target: { name, value } });
        }}
        id={name}
        isLoading={isLoading}
        isClearable
        mainField={mainField}
        move={moveRelation}
        name={name}
        nextSearch={nextSearch}
        options={options}
        onChange={value => {
          onChange({ target: { name, value: value ? value.value : value } });
        }}
        onInputChange={onInputChange}
        onMenuClose={() => {
          setState(prevState => ({ ...prevState, _q: '', _start: 0 }));
        }}
        onMenuScrollToBottom={onMenuScrollToBottom}
        onRemove={onRemove}
        placeholder={
          <FormattedMessage id={`${pluginId}.containers.Edit.addAnItem`} />
        }
        targetModel={targetModel}
        value={value}
      />
      <div style={{ marginBottom: 26 }} />
    </Wrapper>
  );
}

SelectWrapper.defaultProps = {
  description: '',
  label: '',
  plugin: '',
  value: null,
};

SelectWrapper.propTypes = {
  description: PropTypes.string,
  label: PropTypes.string,
  mainField: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  plugin: PropTypes.string,
  relationType: PropTypes.string.isRequired,
  targetModel: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default memo(SelectWrapper);
