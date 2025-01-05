export interface ErrorWithCode {
    code: string;
}

export class ContentTypeNotFoundError extends Error implements ErrorWithCode {
    code: 'CONTENT_TYPE_NOT_FOUND';
    contentType: string;

    constructor(contentType: string) {
        super(`Content type not found: ${contentType}`);
        this.code = 'CONTENT_TYPE_NOT_FOUND';
        this.contentType = contentType;
    }
}

export class GroupNameFieldNotFound extends Error implements ErrorWithCode {
    code: 'GROUP_NAME_FIELD_NOT_FOUND';
    groupNameField: string;

    constructor(groupNameField: string) {
        super(`Group name field not found: ${groupNameField}`);
        this.code = 'GROUP_NAME_FIELD_NOT_FOUND';
        this.groupNameField = groupNameField;
    }
}
