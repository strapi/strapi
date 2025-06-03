import permissions from '@strapi/permissions';

type Options = Parameters<typeof permissions.engine.new>[0];

export default ({ providers }: Options) => permissions.engine.new({ providers });
