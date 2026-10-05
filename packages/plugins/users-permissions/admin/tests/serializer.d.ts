declare module 'jest-styled-components/serializer' {
  // The serializer uses the standard pretty-format interface; its published
  // declaration refers to Jest's older copy of pretty-format.
  export const styleSheetSerializer: Parameters<
    typeof import('vitest').expect.addSnapshotSerializer
  >[0];
}
