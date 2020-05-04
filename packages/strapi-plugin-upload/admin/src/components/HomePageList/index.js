import React from 'react';
import PropTypes from 'prop-types';
import { PageFooter, useQuery } from 'strapi-helper-plugin';
import { generatePageFromStart, generateStartFromPage } from '../../utils';

import List from '../List';
import ListEmpty from '../ListEmpty';
import Padded from '../Padded';

const HomePageList = ({
  areResultsEmpty,
  data,
  dataCount,
  dataToDelete,
  onCardCheck,
  onCardClick,
  onChange,
  onClick,
}) => {
  const query = useQuery();

  const limit = parseInt(query.get('_limit'), 10) || 10;
  const start = parseInt(query.get('_start'), 10) || 0;

  const params = {
    _limit: limit,
    _page: generatePageFromStart(start, limit),
  };

  const handleChangeListParams = ({ target: { name, value } }) => {
    if (name.includes('_page')) {
      onChange({
        target: { name: '_start', value: generateStartFromPage(value, limit) },
      });
    } else {
      onChange({ target: { name: '_limit', value } });
    }
  };

  if (dataCount > 0 && !areResultsEmpty) {
    return (
      <>
        <List
          data={data}
          onChange={onCardCheck}
          onCardClick={onCardClick}
          selectedItems={dataToDelete}
        />
        <Padded left right size="sm">
          <Padded left right size="xs">
            <PageFooter
              context={{ emitEvent: () => {} }}
              count={dataCount}
              onChangeParams={handleChangeListParams}
              params={params}
            />
          </Padded>
        </Padded>
      </>
    );
  }

  return <ListEmpty onClick={onClick} hasSearchApplied={areResultsEmpty} />;
};

HomePageList.defaultProps = {
  areResultsEmpty: false,
  data: [],
  dataCount: 0,
  dataToDelete: [],
  onCardCheck: () => {},
  onCardClick: () => {},
  onChange: () => {},
  onClick: () => {},
};

HomePageList.propTypes = {
  areResultsEmpty: PropTypes.bool,
  data: PropTypes.array,
  dataCount: PropTypes.number,
  dataToDelete: PropTypes.array,
  onCardCheck: PropTypes.func,
  onCardClick: PropTypes.func,
  onChange: PropTypes.func,
  onClick: PropTypes.func,
};

export default HomePageList;
