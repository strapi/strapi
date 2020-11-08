import React, { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import { GlobalPagination, InputSelect, useGlobalContext } from 'strapi-helper-plugin';
import useListView from '../../hooks/useListView';
import { FooterWrapper, SelectWrapper, Label } from './components';

function Footer() {
  const { emitEvent } = useGlobalContext();
  const { count, onChangeSearch, _limit, _page } = useListView();

  const handleChangePage = ({ target: { value } }) => {
    onChangeSearch({ target: { name: '_page', value } });
  };

  const handleChangeLimit = ({ target: { value } }) => {
    emitEvent('willChangeNumberOfEntriesPerPage');

    onChangeSearch({ target: { name: '_limit', value } });
  };

  return (
    <FooterWrapper className="row">
      <div className="col-6">
        <SelectWrapper>
          <InputSelect
            style={{ width: '75px', height: '32px', marginTop: '-1px' }}
            name="_limit"
            onChange={handleChangeLimit}
            selectOptions={['10', '20', '50', '100']}
            value={_limit}
          />
          <Label htmlFor="_limit">
            <FormattedMessage id="components.PageFooter.select" />
          </Label>
        </SelectWrapper>
      </div>
      <div className="col-6">
        <GlobalPagination
          count={count}
          onChangeParams={handleChangePage}
          params={{
            currentPage: _page,
            _limit,
            _page,
          }}
        />
      </div>
    </FooterWrapper>
  );
}

export default memo(Footer);
