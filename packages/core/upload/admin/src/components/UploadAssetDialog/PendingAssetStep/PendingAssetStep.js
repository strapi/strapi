import React from 'react';
import PropTypes from 'prop-types';
import { ModalHeader, ModalBody, ModalFooter } from '@strapi/parts/ModalLayout';
import { ButtonText, Text } from '@strapi/parts/Text';
import { Button } from '@strapi/parts/Button';
import { useIntl } from 'react-intl';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { KeyboardNavigable } from '@strapi/parts/KeyboardNavigable';
import { DocAssetCard } from '../../AssetCard/DocAssetCard';
import { getTrad } from '../../../utils';

export const PendingAssetStep = ({ onClose }) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <ModalHeader>
        <ButtonText textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('header.actions.upload-assets'),
            defaultMessage: 'Upload assets',
          })}
        </ButtonText>
      </ModalHeader>

      <ModalBody>
        <Stack size={7}>
          <Row justifyContent="space-between">
            <Stack size={0}>
              <Text small bold textColor="neutral800">
                {formatMessage(
                  {
                    id: getTrad('list.assets.selected.plural'),
                    defaultMessage: '0 asset selected',
                  },
                  { number: 0 }
                )}
              </Text>
              <Text small textColor="neutral600">
                {formatMessage({
                  id: getTrad('modal.upload-list.sub-header-subtitle'),
                  defaultMessage: 'Manage the assets before adding them to the Media Library',
                })}
              </Text>
            </Stack>
            <Button size="S">
              {formatMessage({
                id: getTrad('header.actions.upload-new-asset'),
                defaultMessage: 'Upload new asset',
              })}
            </Button>
          </Row>
          <KeyboardNavigable tagName="article">
            <Grid gap={4}>
              {Array(20)
                .fill(null)
                .map((_, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <GridItem col={3} key={`grid-item-${idx}`}>
                    <DocAssetCard name="This is a test" extension="pdf" />
                  </GridItem>
                ))}
            </Grid>
          </KeyboardNavigable>
        </Stack>
      </ModalBody>

      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'cancel' })}
          </Button>
        }
        endActions={
          <Button type="submit">
            {formatMessage(
              {
                id: getTrad('modal.upload-list.footer.button.singular'),
                defaultMessage: 'Upload assets',
              },
              { number: 0 }
            )}
          </Button>
        }
      />
    </>
  );
};

PendingAssetStep.propTypes = {
  onClose: PropTypes.func.isRequired,
};
