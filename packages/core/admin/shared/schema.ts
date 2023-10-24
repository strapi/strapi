import { Schema } from '@strapi/types';

export interface ContentType extends Schema.ContentType {
    isDisplayed: boolean;
}

export interface Component extends Schema.Component {
    isDisplayed: boolean;
}
