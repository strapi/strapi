import type { Schema, Attribute } from '@strapi/strapi';

export interface BasicRelation extends Schema.Component {
  collectionName: 'components_basic_relations';
  info: {
    displayName: 'Relation';
  };
  attributes: {
    categories: Attribute.Relation<'basic.relation', 'oneToMany', 'api::category.category'>;
  };
}

export interface BasicSimple extends Schema.Component {
  collectionName: 'components_basic_simples';
  info: {
    displayName: 'simple';
    icon: 'ambulance';
    description: '';
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    test: Attribute.String;
  };
}

export interface BlogTestComo extends Schema.Component {
  collectionName: 'components_blog_test_comos';
  info: {
    displayName: 'test comp';
    icon: 'air-freshener';
    description: '';
  };
  attributes: {
    name: Attribute.String & Attribute.DefaultTo<'toto'>;
  };
}

export interface DefaultApple extends Schema.Component {
  collectionName: 'components_default_apples';
  info: {
    displayName: 'apple';
    icon: 'apple-alt';
    description: '';
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
  };
}

export interface DefaultCar extends Schema.Component {
  collectionName: 'components_default_cars';
  info: {
    displayName: 'car';
    icon: 'align-right';
  };
  attributes: {
    name: Attribute.String;
  };
}

export interface DefaultClosingperiod extends Schema.Component {
  collectionName: 'components_closingperiods';
  info: {
    displayName: 'closingperiod';
    description: '';
    icon: 'angry';
  };
  attributes: {
    label: Attribute.String & Attribute.DefaultTo<'toto'>;
    start_date: Attribute.Date & Attribute.Required;
    end_date: Attribute.Date & Attribute.Required;
    media: Attribute.Media;
    dish: Attribute.Component<'default.dish', true> &
      Attribute.Required &
      Attribute.SetMinMax<{
        min: 2;
      }>;
  };
}

export interface DefaultDish extends Schema.Component {
  collectionName: 'components_dishes';
  info: {
    displayName: 'dish';
    description: '';
    icon: 'address-book';
  };
  attributes: {
    name: Attribute.String & Attribute.DefaultTo<'My super dish'>;
    description: Attribute.Text;
    price: Attribute.Float;
    picture: Attribute.Media;
    very_long_description: Attribute.RichText;
    categories: Attribute.Relation<'default.dish', 'oneToOne', 'api::category.category'>;
  };
}

export interface DefaultOpeningtimes extends Schema.Component {
  collectionName: 'components_openingtimes';
  info: {
    displayName: 'openingtimes';
    description: '';
    icon: 'calendar';
  };
  attributes: {
    label: Attribute.String & Attribute.Required & Attribute.DefaultTo<'something'>;
    time: Attribute.String;
    dishrep: Attribute.Component<'default.dish', true>;
  };
}

export interface DefaultRestaurantservice extends Schema.Component {
  collectionName: 'components_restaurantservices';
  info: {
    displayName: 'restaurantservice';
    description: '';
    icon: 'cannabis';
  };
  attributes: {
    name: Attribute.String & Attribute.Required & Attribute.DefaultTo<'something'>;
    media: Attribute.Media;
    is_available: Attribute.Boolean & Attribute.Required & Attribute.DefaultTo<true>;
  };
}

export interface DefaultTemp extends Schema.Component {
  collectionName: 'components_default_temps';
  info: {
    displayName: 'temp';
    icon: 'adjust';
    description: '';
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    url: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'basic.relation': BasicRelation;
      'basic.simple': BasicSimple;
      'blog.test-como': BlogTestComo;
      'default.apple': DefaultApple;
      'default.car': DefaultCar;
      'default.closingperiod': DefaultClosingperiod;
      'default.dish': DefaultDish;
      'default.openingtimes': DefaultOpeningtimes;
      'default.restaurantservice': DefaultRestaurantservice;
      'default.temp': DefaultTemp;
    }
  }
}
