type Condition = {
  id: string;
  displayName: string;
  category: string;
};

type Permission = {
  action: string;
  displayName: string;
  plugin: string;
  subCategory: string;
};

type ContentTypePermission = {
  actionId: string;
  applyToProperties: string[];
  label: string;
  subjects: string[];
};

type ContentTypeSubject = {
  uid: string;
  label: string;
  properties: ContentTypeSubjectProperties[];
};

type ContentTypeSubjectPropertyChild = {
  label: string;
  value: string;
  required?: boolean;
};

type ContentTypeSubjectProperties = {
  label: string;
  value: string;
  children: ContentTypeSubjectPropertyChild[];
};

type ContentTypePermissions = {
  actions: ContentTypePermission[];
  subjects: ContentTypeSubject[];
};

export interface RolePermissions {
  conditions: Condition[];
  sections: {
    plugins: Permission[];
    settings: Permission[];
    singleTypes: ContentTypePermissions;
    collectionTypes: ContentTypePermissions;
  };
}
