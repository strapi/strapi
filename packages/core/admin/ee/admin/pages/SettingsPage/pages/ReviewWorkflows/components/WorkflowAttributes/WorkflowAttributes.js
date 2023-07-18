import * as React from 'react';

import { Grid, GridItem, MultiSelectNested, TextInput } from '@strapi/design-system';
import { useCollator } from '@strapi/helper-plugin';
import { useField } from 'formik';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { updateWorkflow } from '../../actions';

export function WorkflowAttributes({ canUpdate, contentTypes: { collectionTypes, singleTypes } }) {
  const { formatMessage, locale } = useIntl();
  const dispatch = useDispatch();
  const [nameField, nameMeta, nameHelper] = useField('name');
  const [contentTypesField, contentTypesMeta, contentTypesHelper] = useField('contentTypes');
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  return (
    <Grid background="neutral0" hasRadius gap={4} padding={6} shadow="tableShadow">
      <GridItem col={6}>
        <TextInput
          {...nameField}
          id={nameField.name}
          disabled={!canUpdate}
          label={formatMessage({
            id: 'Settings.review-workflows.workflow.name.label',
            defaultMessage: 'Workflow Name',
          })}
          error={nameMeta.error ?? false}
          onChange={(event) => {
            dispatch(updateWorkflow({ name: event.target.value }));
            nameHelper.setValue(event.target.value);
          }}
          required
        />
      </GridItem>

      <GridItem col={6}>
        <MultiSelectNested
          {...contentTypesField}
          customizeContent={(value) =>
            formatMessage(
              {
                id: 'Settings.review-workflows.workflow.contentTypes.displayValue',
                defaultMessage:
                  '{count} {count, plural, one {content type} other {content types}} selected',
              },
              { count: value.length }
            )
          }
          disabled={!canUpdate}
          error={contentTypesMeta.error ?? false}
          id={contentTypesField.name}
          label={formatMessage({
            id: 'Settings.review-workflows.workflow.contentTypes.label',
            defaultMessage: 'Associated to',
          })}
          onChange={(values) => {
            dispatch(updateWorkflow({ contentTypes: values }));
            contentTypesHelper.setValue(values);
          }}
          options={[
            {
              label: formatMessage({
                id: 'Settings.review-workflows.workflow.contentTypes.collectionTypes.label',
                defaultMessage: 'Collection Types',
              }),
              children: collectionTypes
                .sort((a, b) => formatter.compare(a.info.displayName, b.info.displayName))
                .map((contentType) => ({
                  label: contentType.info.displayName,
                  value: contentType.uid,
                })),
            },

            {
              label: formatMessage({
                id: 'Settings.review-workflows.workflow.contentTypes.singleTypes.label',
                defaultMessage: 'Single Types',
              }),
              children: singleTypes.map((contentType) => ({
                label: contentType.info.displayName,
                value: contentType.uid,
              })),
            },
          ]}
          placeholder={formatMessage({
            id: 'Settings.review-workflows.workflow.contentTypes.placeholder',
            defaultMessage: 'Select',
          })}
        />
      </GridItem>
    </Grid>
  );
}

const ContentTypeType = PropTypes.shape({
  uid: PropTypes.string.isRequired,
  info: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
  }).isRequired,
});

WorkflowAttributes.defaultProps = {
  canUpdate: true,
};

WorkflowAttributes.propTypes = {
  canUpdate: PropTypes.bool,
  contentTypes: PropTypes.shape({
    collectionTypes: PropTypes.arrayOf(ContentTypeType).isRequired,
    singleTypes: PropTypes.arrayOf(ContentTypeType).isRequired,
  }).isRequired,
};
