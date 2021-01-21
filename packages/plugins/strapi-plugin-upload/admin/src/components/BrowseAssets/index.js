import React from 'react';
import { isEmpty } from 'lodash';
import { PageFooter } from 'strapi-helper-plugin';
import { generatePageFromStart, generateStartFromPage } from '../../utils';
import Filters from '../Filters';
import Flex from '../Flex';
import List from '../List';
import ListEmpty from '../ListEmpty';
import Padded from '../Padded';
import SelectAll from '../SelectAll';
import SortPicker from '../SortPicker';
import useModalContext from '../../hooks/useModalContext';
import Wrapper from './Wrapper';
import CardControl from '../CardControl';

const BrowseAssets = () => {
  const {
    allowedActions,
    allowedTypes,
    count,
    files,
    goTo,
    handleAllFilesSelection,
    handleFileSelection,
    handleGoToEditFile,
    multiple,
    noNavigation,
    params,
    removeFilter,
    selectedFiles,
    setParam,
  } = useModalContext();

  const handleChangeParams = ({ target: { name, value } }) => {
    setParam({ name, value });
  };

  const handleChangeListParams = ({ target: { name, value } }) => {
    if (name.includes('_page')) {
      handleChangeParams({
        target: { name: '_start', value: generateStartFromPage(value, params._limit) },
      });
    } else {
      handleChangeParams({ target: { name: '_limit', value } });
    }
  };

  const handleDeleteFilter = index => {
    removeFilter(index);
  };

  const handleGoToUpload = () => {
    goTo('browse');
  };

  const limit = parseInt(params._limit, 10) || 10;
  const start = parseInt(params._start, 10) || 0;
  const canSelectFile = multiple === true || (selectedFiles.length < 1 && !multiple);

  const handleCheckboxChange = ({ target: { name } }) => {
    handleListCardClick(name);
  };

  const handleListCardClick = id => {
    if (!canSelectFile && id !== selectedFiles[0].id) {
      handleFileSelection({
        target: {
          name: selectedFiles[0].id,
        },
      });
    }

    handleFileSelection({
      target: {
        name: id,
      },
    });
  };

  /* eslint-disable indent */
  /* eslint-disable react/jsx-indent */
  const renderCardControl = noNavigation
    ? null
    : id => {
        if (!allowedActions.canUpdate) {
          return null;
        }

        return (
          <CardControl
            small
            title="edit"
            color="#9EA7B8"
            type="pencil"
            onClick={e => {
              e.stopPropagation();
              handleGoToEditFile(id);
            }}
          />
        );
      };

  /* eslint-enable indent */
  /* eslint-enable react/jsx-indent */

  const paginationParams = {
    _limit: parseInt(params._limit, 10) || 10,
    _page: generatePageFromStart(start, limit),
  };

  const hasSomeCheckboxSelected = files.some(file =>
    selectedFiles.find(selectedFile => file.id === selectedFile.id)
  );
  const areAllCheckboxesSelected =
    files.every(file => selectedFiles.find(selectedFile => file.id === selectedFile.id)) &&
    hasSomeCheckboxSelected;

  const hasFilters = !isEmpty(params.filters.filter(filter => !filter.isDisabled));
  const hasSearch = !isEmpty(params._q);
  const areResultsEmptyWithSearchOrFilters = isEmpty(files) && (hasSearch || hasFilters);

  return (
    <>
      <Wrapper>
        <Padded top>
          {allowedActions.canRead && (
            <Flex flexWrap="wrap">
              {multiple && (
                <Padded right size="sm">
                  <SelectAll
                    checked={areAllCheckboxesSelected}
                    onChange={handleAllFilesSelection}
                    someChecked={hasSomeCheckboxSelected && !areAllCheckboxesSelected}
                  />
                </Padded>
              )}
              <SortPicker onChange={handleChangeParams} value={params._sort} />
              <Padded left size="sm" />
              <Filters
                filters={params.filters}
                onChange={handleChangeParams}
                onClick={handleDeleteFilter}
              />
            </Flex>
          )}
        </Padded>
        {!files || files.length === 0 ? (
          <ListEmpty
            canCreate={allowedActions.canCreate}
            numberOfRows={2}
            onClick={handleGoToUpload}
            hasSearchApplied={areResultsEmptyWithSearchOrFilters}
          />
        ) : (
          <>
            <List
              data={files}
              onChange={handleCheckboxChange}
              selectedItems={selectedFiles}
              onCardClick={handleListCardClick}
              allowedTypes={allowedTypes}
              smallCards
              renderCardControl={renderCardControl}
            />
            <Padded left right>
              <Padded left right size="xs">
                <PageFooter
                  context={{ emitEvent: () => {} }}
                  count={count}
                  onChangeParams={handleChangeListParams}
                  params={paginationParams}
                />
              </Padded>
            </Padded>
          </>
        )}
      </Wrapper>
    </>
  );
};

export default BrowseAssets;
