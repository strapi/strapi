'use strict';

const stripAnsi = require('strip-ansi');

const normalizeLineEndings = (str) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const trimLines = (str) => {
  const lines = normalizeLineEndings(str)
    .split('\n')
    .map((line) => stripAnsi(line).trim());

  // Remove leading empty lines
  while (lines.length > 0 && lines[0].length === 0) {
    lines.shift();
  }

  // Remove trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1].length === 0) {
    lines.pop();
  }

  // TODO: FIXME this is a workaround to fix the malformed �� sequences cliTable.toString() produces instead of dashes
  // Filter out lines that do not contain any alphanumeric characters
  return lines.filter((line) => /[a-zA-Z0-9]/.test(line));
};

const expectConsoleLinesToEqual = (received, expected) => {
  const receivedLines = trimLines(received);
  const expectedLines = trimLines(expected);

  expect(receivedLines).toEqual(expectedLines);
};

const expectConsoleLinesToInclude = (received, expected) => {
  const receivedLines = trimLines(received);
  const expectedLines = trimLines(expected);

  expectedLines.forEach((line) => {
    expect(receivedLines).toContain(line);
  });
};

module.exports = {
  expectConsoleLinesToEqual,
  expectConsoleLinesToInclude,
};
