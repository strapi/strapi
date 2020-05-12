import React from 'react';
import PropTypes from 'prop-types';
import { ModalSection } from 'strapi-helper-plugin';
import { FormattedMessage } from 'react-intl';
import { Inputs } from '@buffetjs/custom';
import { Padded, Text } from '@buffetjs/core';
import { Col, Row } from 'reactstrap';

import Wrapper from './Wrapper';
import form from './utils/form';

const ModalCreateBody = ({ onSubmit }) => {
  return (
    <form onSubmit={onSubmit}>
      <ModalSection>
        <Padded top size="18px">
          <Text fontSize="xs" color="grey" fontWeight="bold" textTransform="uppercase">
            <FormattedMessage id="app.components.Users.ModalCreateBody.block-title.details">
              {txt => txt}
            </FormattedMessage>
          </Text>
        </Padded>
      </ModalSection>
      <ModalSection>
        <Wrapper>
          <Padded top size="20px">
            <Row>
              {Object.keys(form).map(inputName => (
                <Col xs="6" key={inputName}>
                  <FormattedMessage id={form[inputName].label}>
                    {label => <Inputs {...form[inputName]} label={label} name={inputName} />}
                  </FormattedMessage>
                </Col>
              ))}
            </Row>
          </Padded>
        </Wrapper>
      </ModalSection>
      <ModalSection>
        <Padded top size="3px">
          <Text fontSize="xs" color="grey" fontWeight="bold" textTransform="uppercase">
            <FormattedMessage id="app.components.Users.ModalCreateBody.block-title.roles">
              {txt => txt}
            </FormattedMessage>
          </Text>
        </Padded>
      </ModalSection>
      <ModalSection>COMING SOON</ModalSection>
      <button type="submit" style={{ display: 'none' }}>
        hidden button to make to get the native form event
      </button>
    </form>
  );
};

ModalCreateBody.defaultProps = {
  onSubmit: e => e.preventDefault(),
};

ModalCreateBody.propTypes = {
  onSubmit: PropTypes.func,
};

export default ModalCreateBody;
