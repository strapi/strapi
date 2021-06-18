import React from 'react';
import { Button, Padded, Text } from '@buffetjs/core';
import { useHistory } from 'react-router';
import { BaselineAlignment, CheckPermissions } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { getTrad } from '../../utils';
import Container from '../../components/Container';
// TODO change pic when DS ready
import Oops from './oops.png';

const Block = styled.div`
  padding: 48px 10px 50px 10px;
  background: #ffffff;
  border-radius: 2px;
  box-shadow: 0 2px 4px #e3e9f3;
  margin-bottom: 17px;
  text-align: center;
`;

const Img = styled.img`
  max-height: 77px;
`;

const NoContentType = () => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();

  const handleClick = () => {
    // TODO change url when CTB ready
    push(
      '/plugins/content-type-builder/content-types/plugins::users-permissions.user?modalType=contentType&kind=collectionType&actionType=create&settingType=base&forTarget=contentType&headerId=content-type-builder.modalForm.contentType.header-create&header_icon_isCustom_1=false&header_icon_name_1=contentType&header_label_1=null'
    );
  };

  return (
    <Container>
      <Block>
        <Img src={Oops} />
        <div>
          <Padded top size="md">
            <BaselineAlignment top size="5px" />
            <Text>
              {formatMessage({
                id: getTrad('pages.NoContentType.text'),
                defaultMessage:
                  "You don't have any content yet, we recommend you to create your first Content-Type.",
              })}
            </Text>
          </Padded>
          <CheckPermissions
            permissions={[{ action: 'plugins::content-type-builder.read', subject: null }]}
          >
            <BaselineAlignment top size="14px">
              <Button color="primary" type="button" onClick={handleClick}>
                {formatMessage({
                  id: 'pages.NoContentType.button',
                  defaultMessage: 'Create your first Content-Type',
                })}
              </Button>
            </BaselineAlignment>
          </CheckPermissions>
        </div>
      </Block>
    </Container>
  );
};

export default NoContentType;
