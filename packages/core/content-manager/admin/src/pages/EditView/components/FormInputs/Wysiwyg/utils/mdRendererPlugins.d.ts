/* eslint-disable import/no-default-export -- default exports are required to declare these untyped markdown-it plugin modules */
// Adding any top level static import/export to this file
// Will make it a module, and break modules declarations
type PluginSimple = import('markdown-it').PluginSimple;
type PluginWithOptions<T> = import('markdown-it').PluginWithOptions<T>;

declare module 'markdown-it-abbr' {
  const plugin: PluginSimple;
  export default plugin;
}

declare module 'markdown-it-container' {
  const plugin: PluginWithOptions<string>;
  export default plugin;
}

declare module 'markdown-it-deflist' {
  const plugin: PluginSimple;
  export default plugin;
}

declare module 'markdown-it-emoji' {
  const plugin: PluginSimple;
  export default plugin;
}

declare module 'markdown-it-footnote' {
  const plugin: PluginSimple;
  export default plugin;
}

declare module 'markdown-it-ins' {
  const plugin: PluginSimple;
  export default plugin;
}

declare module 'markdown-it-mark' {
  const plugin: PluginSimple;
  export default plugin;
}

declare module 'markdown-it-sub' {
  const plugin: PluginSimple;
  export default plugin;
}

declare module 'markdown-it-sup' {
  const plugin: PluginSimple;
  export default plugin;
}
