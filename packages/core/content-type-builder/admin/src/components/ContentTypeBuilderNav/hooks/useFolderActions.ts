import { useMemo } from 'react';

import { DID_ACT_ON_FOLDERS, folderTelemetryOperation } from '../../../utils/folderTelemetry';
import { useCTBTracking } from '../../CTBSession/ctbSession';
import { useDataManager } from '../../DataManager/useDataManager';

import type { FolderAction } from '../../../utils/folderTelemetry';
import type { SectionKey } from '../../DataManager/utils/contentStructure';
import type { UID } from '@strapi/types';

export const useFolderActions = () => {
  const { trackUsage } = useCTBTracking();
  const {
    assignContentTypeToFolder,
    deleteFolderAndContent,
    reorderFolderChildren,
    deleteFolderOnly,
    createFolder,
    renameFolder,
    moveFolder,
  } = useDataManager();

  return useMemo(() => {
    const track = (action: FolderAction) => {
      return trackUsage(DID_ACT_ON_FOLDERS, { operation: folderTelemetryOperation(action) });
    };

    return {
      createFolder: (payload: { section: SectionKey; name: string; parentId: string | null }) => {
        createFolder(payload);
        track('create');
      },
      renameFolder: (payload: { section: SectionKey; id: string; name: string }) => {
        renameFolder(payload);
        track('rename');
      },
      moveFolder: (payload: {
        section: SectionKey;
        id: string;
        newParentId: string | null;
        index?: number;
      }) => {
        moveFolder(payload);
        track('move');
      },
      deleteFolderOnly: (payload: { section: SectionKey; id: string }) => {
        deleteFolderOnly(payload);
        track('deleteOnly');
      },
      deleteFolderAndContent: (payload: {
        section: SectionKey;
        id: string;
        contentTypeUids: UID.ContentType[];
      }) => {
        deleteFolderAndContent(payload);
        track('deleteSubtree');
      },
      assignContentTypeToFolder: (payload: {
        section: SectionKey;
        uid: UID.ContentType;
        targetGroupId: string | null;
        index?: number;
      }) => {
        assignContentTypeToFolder(payload);
        track('assign');
      },
      reorderFolderChildren: (payload: {
        section: SectionKey;
        groupId: string;
        from: number;
        to: number;
      }) => {
        reorderFolderChildren(payload);
        track('reorder');
      },
    };
  }, [
    assignContentTypeToFolder,
    deleteFolderAndContent,
    reorderFolderChildren,
    deleteFolderOnly,
    createFolder,
    renameFolder,
    moveFolder,
    trackUsage,
  ]);
};

export type FolderActions = ReturnType<typeof useFolderActions>;
