import React from 'react';
import PropTypes from 'prop-types';
import { PageFooter, useQuery } from 'strapi-helper-plugin';
import { generatePageFromStart, generateStartFromPage } from '../../../utils';
import { useAppContext } from '../../../hooks';
import List from '../../../components/List';
import ListEmpty from '../../../components/ListEmpty';
import Padded from '../../../components/Padded';

const HomePageList = ({
  areResultsEmptyWithSettings,
  data,
  dataCount,
  dataToDelete,
  onCardCheck,
  onCardClick,
  onChange,
  onClick,
}) => {
  const query = useQuery();
  const {
    allowedActions: { canCreate, canUpdate },
  } = useAppContext();

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

  if (dataCount > 0 && !areResultsEmptyWithSettings) {
    return (
      <>
        <List
          data={data}
          onChange={onCardCheck}
          onCardClick={onCardClick}
          selectedItems={dataToDelete}
          showCheckbox={canUpdate}
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

  return (
    <ListEmpty
      canCreate={canCreate}
      onClick={onClick}
      hasSearchApplied={areResultsEmptyWithSettings}
    />
  );
};

HomePageList.defaultProps = {
  areResultsEmptyWithSettings: false,
  data: [],
  dataCount: 0,
  dataToDelete: [],
  onCardCheck: () => {},
  onCardClick: () => {},
  onChange: () => {},
  onClick: () => {},
};

HomePageList.propTypes = {
  areResultsEmptyWithSettings: PropTypes.bool,
  data: PropTypes.array,
  dataCount: PropTypes.number,
  dataToDelete: PropTypes.array,
  onCardCheck: PropTypes.func,
  onCardClick: PropTypes.func,
  onChange: PropTypes.func,
  onClick: PropTypes.func,
};

export default HomePageList;
