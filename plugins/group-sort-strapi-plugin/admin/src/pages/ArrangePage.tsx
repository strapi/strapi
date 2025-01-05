import { Box, Button, Flex, Grid, Main, StrapiTheme } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useTranslation } from '../hooks/useTranslation';
import GridLayout from "react-grid-layout";

import styled from 'styled-components';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useContext, useEffect, useState } from 'react';

import { LeftMenu } from '../components/LeftMenu';
import { Check } from '@strapi/icons';
import { get } from 'lodash';
import { UserSettings } from '../components/ArrangePage/UserSettings';
import { GroupAndArrangeContext } from '../components/GroupAndArrangeContextProvider';
import { useBlocker } from 'react-router-dom';
import { ItemsDictionary } from '../types'
import Order1dComponent from '../components/ArrangePage/Order1dComponent';
import Order2dComponent from '../components/ArrangePage/Order2dComponent';
import OrderMultilineComponent from '../components/ArrangePage/OrderMultilineComponent';
import { MultilinePosition } from '../../../shared/contracts';

const StyledUserSettings = styled(UserSettings)`
  align-items: flex-start;
`;

const MainBox = styled(Box)`
  margin: ${({ theme }) => (theme as StrapiTheme).spaces[4]};
  padding: ${({ theme }) => (theme as StrapiTheme).spaces[6]};
  background-color: ${({ theme }) => (theme as StrapiTheme).colors.neutral0};
`;

const ArrangePage = () => {
  const { formatMessage } = useTranslation();
  const { formatMessage: formatMessageIntl } = useIntl();
  const fetchClient = useFetchClient();
  const { toggleNotification } = useNotification();

  const {
    contentTypeUid,
    groupField,
    groupName,
    groupData,
    currentAttribute,
    mediaAttributeNames,
    titleAttributeNames,
    currentCollectionType,
    isLoading: isLoadingExt,
    triggerUpdate
  } = useContext(GroupAndArrangeContext);
  if (!contentTypeUid || !groupField || !groupName) {
    return <Page.Error />;
  }

  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    setIsModified(false);
    setIsSaving(false);
  }, [contentTypeUid, groupField, groupName]);
  
  const [layout1d, setLayout1d] = useState([] as string[]);
  const [layout2d, setLayout2d] = useState([] as GridLayout.Layout[]);
  const [layoutMultiline, setLayoutMultiline] = useState({} as Record<string, string[]>);

  const [itemsDictionary, setItemsDictionary] = useState({} as ItemsDictionary);
  useEffect(() => {
    const itemsDictionary = (groupData?.items || []).reduce((acc: ItemsDictionary, item) => {
      acc[item.documentId] = {
        ...item,
        thumbnailUrisByMediaFields: mediaAttributeNames.reduce((mediaAcc: Record<string, string>, mediaAttributeName) => {
          const media = item[mediaAttributeName];
          let mediaUrl = Array.isArray(media) ? media[0]?.url : media?.url;
          mediaUrl = get(media, ['formats', 'small', 'url']) || mediaUrl;
          mediaUrl = get(media, ['formats', 'thumbnail', 'url']) || mediaUrl;

          if (mediaUrl) {
            mediaAcc[mediaAttributeName] = mediaUrl;
          }
          return mediaAcc;
        }, {}),
        titlesByTitleFields: titleAttributeNames.reduce((titleAcc: Record<string, string>, titleAttributeName) => {
          titleAcc[titleAttributeName] = item[titleAttributeName];
          return titleAcc;
        }, {})
      };
      return acc;
    }, {});

    setItemsDictionary(itemsDictionary);
  }, [groupData]);


  async function handleSave(): Promise<void> {
    setIsSaving(true);

    if (currentAttribute?.order === '1d') {
      const currentValues = layout1d.map((documentId, index) => ({ documentId, index }));
      for (const { documentId, index } of currentValues) {
        await fetchClient.put(`/content-manager/collection-types/${currentCollectionType?.uid}/${documentId}`, {
          [groupField!]: index
        });
      }
    }
    if (currentAttribute?.order === '2d') {
      for (const item of layout2d) {
        const value = {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h
        };
        await fetchClient.put(`/content-manager/collection-types/${currentCollectionType?.uid}/${item.i}`, {
          [groupField!]: value
        });
      }
    }
    if (currentAttribute?.order === 'multiline') {
      for (const [row, columns] of Object.entries(layoutMultiline)) {
        for (let i = 0; i < columns.length; i++) {
          const itemId = columns[i];
          const value: MultilinePosition = {
            row: parseInt(row),
            column: i
          };
          await fetchClient.put(`/content-manager/collection-types/${currentCollectionType?.uid}/${itemId}`, {
            [groupField!]: value
          });
        }
      }
    }

    setIsModified(false);
    setIsSaving(false);
    triggerUpdate();

    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'arrange.saved',
        defaultMessage: 'Changes saved',
      }),
    })
  }

  useBlocker(() => {
    if(isModified)
    {
      const confirmation = confirm(formatMessage({
        id: 'arrange.unsaved-changes',
        defaultMessage: 'You have unsaved changes. Are you sure you want to leave?'
      }));
      return !confirmation;
    }
    return false;
  });

  // if (isLoading || !currentFieldSettings || isSaving) {
  //   return <Page.Loading />;
  // }

  const isLoading = isLoadingExt || isSaving;

  return (
    <Layouts.Root sideNav={<LeftMenu />}>
      <Layouts.Header
        title={formatMessage({
          id: 'plugin.name',
          defaultMessage: 'Group and Arrange',
        })}
        primaryAction={
          <Flex gap={2}>
            <Button
              disabled={isLoading || !isModified}
              loading={isSaving}
              startIcon={<Check />}
              onClick={handleSave}
              size="S"
            >
              {formatMessageIntl({
                id: 'global.save',
                defaultMessage: 'Save',
              })}
            </Button>
          </Flex>} />
      {isLoading && <Page.Loading />}
      {!isLoading &&
        <Main style={{ marginTop: "-24px" }}>
          <MainBox>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <StyledUserSettings />
              {currentAttribute?.order === '1d' &&
                <Order1dComponent
                  itemsDictionary={itemsDictionary}
                  setIsModified={setIsModified}
                  setLayout1d={setLayout1d} />
              }
              {currentAttribute?.order === '2d' &&
                <Order2dComponent
                  itemsDictionary={itemsDictionary}
                  isModified={isModified}
                  setIsModified={setIsModified}
                  setLayout2d={setLayout2d} />
              }
              {currentAttribute?.order === 'multiline' &&
                <OrderMultilineComponent
                  itemsDictionary={itemsDictionary}
                  setIsModified={setIsModified}
                  setLayoutMultiline={setLayoutMultiline} />
              }
            </Flex>
          </MainBox>
        </Main>}
    </Layouts.Root>
  );
};

export default ArrangePage;
