export type InfoType = {
  args?: unknown;
  resourceUID?: string;
};

export default () => ({
  toEntityResponse(value: unknown, info: InfoType = {}) {
    const { args = {}, resourceUID } = info;

    return { value, info: { args, resourceUID } };
  },

  toEntityResponseCollection(nodes: unknown[], info: InfoType = {}) {
    const { args = {}, resourceUID } = info;

    return { nodes, info: { args, resourceUID } };
  },
});
