'use strict';

// Adapted from https://github.com/tleunen/babel-plugin-module-resolver/blob/master/src/resolvePath.js

const path = require('path');
const normalizeOptions = require('./normalizeOptions');
const mapToRelative = require('./mapToRelative');
const { nodeResolvePath, replaceExtension, toLocalPath, toPosixPath } = require('./utils');

function getRelativePath(sourcePath, currentFile, absFileInRoot, opts) {
  const realSourceFileExtension = path.extname(absFileInRoot);
  const sourceFileExtension = path.extname(sourcePath);

  let relativePath = mapToRelative(opts.cwd, currentFile, absFileInRoot);

  if (realSourceFileExtension !== sourceFileExtension) {
    relativePath = replaceExtension(relativePath, opts);
  }

  return toLocalPath(toPosixPath(relativePath));
}

function findPathInRoots(sourcePath, { extensions, roots }) {
  // Search the source path inside every custom root directory

  const resolvedEESourceFile = nodeResolvePath(
    `./${sourcePath.replace('ee_else_ce', '')}`,
    roots.eeRoot,
    extensions
  );
  const resolvedCESourceFile = nodeResolvePath(
    `./${sourcePath.replace('ee_else_ce', '')}`,
    roots.ceRoot,
    extensions
  );

  return { resolvedEESourceFile, resolvedCESourceFile };
}

function resolvePathFromRootConfig(sourcePath, currentFile, opts) {
  const absFileInRoot = findPathInRoots(sourcePath, opts);

  const relativeEEPath = getRelativePath(
    sourcePath,
    currentFile,
    absFileInRoot.resolvedEESourceFile,
    opts
  );

  const relativeCEPath = getRelativePath(
    sourcePath,
    currentFile,
    absFileInRoot.resolvedCESourceFile,
    opts
  );

  return { relativeCEPath, relativeEEPath };
}

function resolvePath(sourcePath, currentFile, opts) {
  const normalizedOpts = normalizeOptions(currentFile, opts);

  // File param is a relative path from the environment current working directory
  // (not from cwd param)
  const absoluteCurrentFile = path.resolve(currentFile);
  const resolvedPaths = resolvePathFromRootConfig(sourcePath, absoluteCurrentFile, normalizedOpts);

  return resolvedPaths;
}

module.exports = resolvePath;
