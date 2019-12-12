import React, { memo } from 'react';
import { FormattedMessage } from 'react-intl';

import { GlobalPagination, InputSelect } from 'strapi-helper-plugin';
import useListView from '../../hooks/useListView';
import { FooterWrapper, SelectWrapper, Label } from './components';

function Footer() {
  const {
    count,
    onChangeParams,
    searchParams: { _limit, _page },
  } = useListView();

  return (
    <FooterWrapper className="row">
      <div className="col-6">
        <SelectWrapper>
          <InputSelect
            style={{ width: '75px', height: '32px', marginTop: '-1px' }}
            name="_limit"
            onChange={onChangeParams}
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
          onChangeParams={({ target: { value } }) => {
            onChangeParams({ target: { name: '_page', value } });
          }}
          params={{
            currentPage: parseInt(_page, 10),
            _limit: parseInt(_limit, 10),
            _page: parseInt(_page, 10),
          }}
        />
      </div>
    </FooterWrapper>
  );
}

export default memo(Footer);
