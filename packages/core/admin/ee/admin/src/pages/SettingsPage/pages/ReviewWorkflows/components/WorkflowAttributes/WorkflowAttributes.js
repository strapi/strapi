import * as React from 'react';

import {
  Grid,
  GridItem,
  MultiSelect,
  MultiSelectGroup,
  MultiSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useCollator } from '@strapi/helper-plugin';
import { useField } from 'formik';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { updateWorkflow } from '../../actions';
import { selectContentTypes, selectCurrentWorkflow, selectWorkflows } from '../../selectors';

const NestedOption = styled(MultiSelectOption)`
  padding-left: ${({ theme }) => theme.spaces[7]};
`;

const ContentTypeTakeNotice = styled(Typography)`
  font-style: italic;
`;

export function WorkflowAttributes({ canUpdate }) {
  const { formatMessage, locale } = useIntl();
  const dispatch = useDispatch();
  const { collectionTypes, singleTypes } = useSelector(selectContentTypes);
  const currentWorkflow = useSelector(selectCurrentWorkflow);
  const workflows = useSelector(selectWorkflows);
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
        <MultiSelect
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
          placeholder={formatMessage({
            id: 'Settings.review-workflows.workflow.contentTypes.placeholder',
            defaultMessage: 'Select',
          })}
        >
          {[
            ...(collectionTypes.length > 0
              ? [
                  {
                    label: formatMessage({
                      id: 'Settings.review-workflows.workflow.contentTypes.collectionTypes.label',
                      defaultMessage: 'Collection Types',
                    }),
                    children: [...collectionTypes]
                      .sort((a, b) => formatter.compare(a.info.displayName, b.info.displayName))
                      .map((contentType) => ({
                        label: contentType.info.displayName,
                        value: contentType.uid,
                      })),
                  },
                ]
              : []),

            ...(singleTypes.length > 0
              ? [
                  {
                    label: formatMessage({
                      id: 'Settings.review-workflows.workflow.contentTypes.singleTypes.label',
                      defaultMessage: 'Single Types',
                    }),
                    children: [...singleTypes].map((contentType) => ({
                      label: contentType.info.displayName,
                      value: contentType.uid,
                    })),
                  },
                ]
              : []),
          ].map((opt) => {
            if ('children' in opt) {
              return (
                <MultiSelectGroup
                  key={opt.label}
                  label={opt.label}
                  values={opt.children.map((child) => child.value.toString())}
                >
                  {opt.children.map((child) => {
                    const { name: assignedWorkflowName } =
                      workflows.find(
                        (workflow) =>
                          ((currentWorkflow && workflow.id !== currentWorkflow.id) ||
                            !currentWorkflow) &&
                          workflow.contentTypes.includes(child.value)
                      ) ?? {};

                    return (
                      <NestedOption key={child.value} value={child.value}>
                        {formatMessage(
                          {
                            id: 'Settings.review-workflows.workflow.contentTypes.assigned.notice',
                            defaultMessage:
                              '{label} {name, select, undefined {} other {<i>(assigned to <em>{name}</em> workflow)</i>}}',
                          },
                          {
                            label: child.label,
                            name: assignedWorkflowName,
                            em: (...children) => (
                              <Typography as="em" fontWeight="bold">
                                {children}
                              </Typography>
                            ),
                            i: (...children) => (
                              <ContentTypeTakeNotice>{children}</ContentTypeTakeNotice>
                            ),
                          }
                        )}
                      </NestedOption>
                    );
                  })}
                </MultiSelectGroup>
              );
            }

            return (
              <MultiSelectOption key={opt.value} value={opt.value}>
                {opt.label}
              </MultiSelectOption>
            );
          })}
        </MultiSelect>
      </GridItem>
    </Grid>
  );
}

WorkflowAttributes.defaultProps = {
  canUpdate: true,
};

WorkflowAttributes.propTypes = {
  canUpdate: PropTypes.bool,
};
