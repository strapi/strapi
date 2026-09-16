// https://github.com/bdadam/rollup-plugin-html
declare module '*.html' {
  const content: string;
  export default content;
}
