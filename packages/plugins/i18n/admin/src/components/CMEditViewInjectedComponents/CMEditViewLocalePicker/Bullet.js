import React from 'react';
import PropTypes from 'prop-types';
// import { useIntl } from 'react-intl';
import styled from 'styled-components';
// import { Tooltip } from '@strapi/parts/Tooltip';
import { pxToRem } from '@strapi/helper-plugin';
// import { getTrad } from '../../../utils';

// TODO
// const CustomBullet = styled(Bullet)`
//   width: ${pxToRem(6)};
//   height: ${pxToRem(6)};
//   * {
//     fill: ${({ theme, $bulletColor }) => theme.colors[$bulletColor]};
//   }
// `;

const statusMap = {
  'did-not-create-locale': {
    backgroundColor: 'neutral0',
    borderColor: 'neutral500',
  },
  draft: {
    backgroundColor: 'secondary700',
  },
  published: {
    backgroundColor: 'success700',
  },
};

// TODO
// const statusToTitleMap = {
//   draft: 'content-manager.components.Select.draft-info-title',
//   published: 'content-manager.components.Select.publish-info-title',
//   'did-not-create-locale': getTrad('components.Select.locales.not-available'),
// };

const StyledBullet = styled.div`
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  border: ${({ theme, status }) => `1px solid ${theme.colors[statusMap[status].borderColor]}`};
  background: ${({ theme, status }) => theme.colors[statusMap[status].backgroundColor]};
  border-radius: 50%;
`;

const Bullet = ({ status }) => {
  // const { formatMessage } = useIntl();

  return <StyledBullet status={status} />;

  // FIXME
  // return (
  //   <Tooltip description={formatMessage({ id: statusToTitleMap[status] })}>
  //     <StyledBullet status={status} />
  //   </Tooltip>
  // );
};

Bullet.propTypes = {
  status: PropTypes.oneOf(['draft', 'published', 'did-not-create-locale']).isRequired,
};

export default Bullet;
