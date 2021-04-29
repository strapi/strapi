import React, { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { GlobalPagination, InputSelect, useGlobalContext } from 'strapi-helper-plugin';

import { FooterWrapper, SelectWrapper, Label } from './components';

function Footer({ count, onChange, params }) {
  const { emitEvent } = useGlobalContext();
  const _limit = parseInt(params.pageSize, 10);
  const _page = parseInt(params.page, 10);

  const handleChangePage = ({ target: { value } }) => {
    onChange({ page: value });
  };

  const handleChangeLimit = ({ target: { value } }) => {
    emitEvent('willChangeNumberOfEntriesPerPage');

    onChange({ pageSize: value });
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

Footer.propTypes = {
  count: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  params: PropTypes.object.isRequired,
};

export default memo(Footer);
