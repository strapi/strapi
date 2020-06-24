import React, { memo } from 'react';
import PropTypes from 'prop-types';
import Sortly from 'react-sortly';
import styled from 'styled-components';
import SortableMenuItem from './SortableMenuItem';

const SortableMenu = ({ items, onChange }) => {
  return (
    <SortlyWrapper>
      <Sortly {...{ items, onChange }}>
        {props => {
          const {
            data: { id, name, depth, isNew },
          } = props;

          return <SortableMenuItem {...{ id, name, depth, isNew }} />;
        }}
      </Sortly>
    </SortlyWrapper>
  );
};

SortableMenu.propTypes = {
  items: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default memo(SortableMenu);

const SortlyWrapper = styled.div`
  display: flex;
  flex-flow: column wrap;
  flex: 0 1 700px;
  margin-top: 10px;
`;
