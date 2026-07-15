import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SOURCE_PATH,
  TARGET_PATHS,
  classify,
  createSkillLink,
  isUnderSkillsRoot,
  linkTargetFor,
  listSourceSkills,
  hasMissingLinks,
  makeLogger,
  pathsEqual,
  sync,
  unlink,
} from '../links.ts';

describe('pathsEqual', () => {
  it('matches exactly on POSIX', () => {
    assert.equal(pathsEqual('/foo/bar', '/foo/bar'), true);
    assert.equal(pathsEqual('/Foo/Bar', '/foo/bar'), false);
  });

  it('ignores case on win32', () => {
    assert.equal(pathsEqual('C:\\Repo\\Skills', 'c:\\repo\\skills', 'win32'), true);
    assert.equal(pathsEqual('/Foo/Bar', '/foo/bar', 'win32'), true);
  });
});

describe('isUnderSkillsRoot', () => {
  it('matches prefix on POSIX', () => {
    const root = '/repo/.ai/skills';
    assert.equal(isUnderSkillsRoot('/repo/.ai/skills/foo', root), true);
    assert.equal(isUnderSkillsRoot('/repo/.ai/skills-archive/foo', root), false);
  });

  it('is case-insensitive on win32', () => {
    const root = 'C:\\Repo\\.ai\\skills';
    assert.equal(isUnderSkillsRoot('c:\\repo\\.ai\\skills\\foo', root, 'win32'), true);
    assert.equal(isUnderSkillsRoot('C:\\REPO\\.ai\\skills\\bar', root, 'win32'), true);
  });
});

describe('linkTargetFor', () => {
  it('returns relative path on POSIX', () => {
    const repoRoot = '/repo';
    const targetPath = path.join(repoRoot, '.cursor/skills', 'foo');
    const result = linkTargetFor(repoRoot, targetPath, 'foo', 'linux');
    assert.equal(result, path.join('..', '..', SOURCE_PATH, 'foo'));
  });

  it('returns absolute source on win32', () => {
    const repoRoot = 'C:\\repo';
    const targetPath = path.join(repoRoot, '.cursor', 'skills', 'foo');
    const result = linkTargetFor(repoRoot, targetPath, 'foo', 'win32');
    assert.equal(result, path.join(repoRoot, SOURCE_PATH, 'foo'));
  });
});

describe('classify', () => {
  const withFixture = (fn: (repoRoot: string) => void): void => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tooling-'));
    try {
      fn(repoRoot);
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  };

  it('returns absent when entry missing', () => {
    withFixture((repoRoot) => {
      const targetPath = path.join(repoRoot, '.cursor/skills', 'foo');
      assert.deepEqual(classify(repoRoot, targetPath, 'foo'), { kind: 'absent' });
    });
  });

  it('recognises relative symlink into .ai/skills as ours + correct', () => {
    withFixture((repoRoot) => {
      const sourceDir = path.join(repoRoot, SOURCE_PATH, 'foo');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# foo');

      const targetDir = path.join(repoRoot, '.cursor/skills');
      fs.mkdirSync(targetDir, { recursive: true });
      const targetPath = path.join(targetDir, 'foo');
      fs.symlinkSync(linkTargetFor(repoRoot, targetPath, 'foo'), targetPath, 'dir');

      assert.deepEqual(classify(repoRoot, targetPath, 'foo'), {
        kind: 'ours',
        correct: true,
      });
    });
  });

  it('treats symlink outside .ai/skills as foreign-link', () => {
    withFixture((repoRoot) => {
      const brainDir = path.join(repoRoot, '.brain/skills/brain-skill');
      fs.mkdirSync(brainDir, { recursive: true });

      const targetDir = path.join(repoRoot, '.cursor/skills');
      fs.mkdirSync(targetDir, { recursive: true });
      const targetPath = path.join(targetDir, 'brain-skill');
      fs.symlinkSync(path.relative(path.dirname(targetPath), brainDir), targetPath, 'dir');

      assert.deepEqual(classify(repoRoot, targetPath, 'brain-skill'), { kind: 'foreign-link' });
    });
  });

  it('treats real directory as real', () => {
    withFixture((repoRoot) => {
      const targetPath = path.join(repoRoot, '.cursor/skills', 'real-dir');
      fs.mkdirSync(targetPath, { recursive: true });
      assert.deepEqual(classify(repoRoot, targetPath, 'real-dir'), { kind: 'real' });
    });
  });
});

describe('sync round-trip', () => {
  it('links, unlinks, and preserves foreign symlinks', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tooling-sync-'));
    try {
      const sourceDir = path.join(repoRoot, SOURCE_PATH, 'foo');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# foo');

      const brainDir = path.join(repoRoot, '.brain/skills/brain-skill');
      fs.mkdirSync(brainDir, { recursive: true });
      const cursorDir = path.join(repoRoot, '.cursor/skills');
      fs.mkdirSync(cursorDir, { recursive: true });
      const foreignPath = path.join(cursorDir, 'brain-skill');
      fs.symlinkSync(path.relative(path.dirname(foreignPath), brainDir), foreignPath, 'dir');

      const log = makeLogger();
      assert.equal(sync(repoRoot, log), 0);

      const linkedPath = path.join(cursorDir, 'foo');
      assert.equal(fs.lstatSync(linkedPath).isSymbolicLink(), true);
      assert.deepEqual(classify(repoRoot, linkedPath, 'foo'), { kind: 'ours', correct: true });
      assert.equal(fs.lstatSync(foreignPath).isSymbolicLink(), true);
      assert.deepEqual(classify(repoRoot, foreignPath, 'brain-skill'), { kind: 'foreign-link' });

      assert.deepEqual(listSourceSkills(repoRoot), ['foo']);

      const unlinkLog = makeLogger();
      assert.equal(unlink(repoRoot, unlinkLog), 0);

      assert.equal(fs.existsSync(linkedPath), false);
      assert.equal(fs.lstatSync(foreignPath).isSymbolicLink(), true);
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('overwrites foreign symlinks and real dirs when force is true', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tooling-sync-force-'));
    try {
      const sourceDir = path.join(repoRoot, SOURCE_PATH, 'foo');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# foo');

      const brainDir = path.join(repoRoot, '.brain/skills/brain-skill');
      fs.mkdirSync(brainDir, { recursive: true });

      const cursorDir = path.join(repoRoot, '.cursor/skills');
      fs.mkdirSync(cursorDir, { recursive: true });

      const foreignPath = path.join(cursorDir, 'foo');
      fs.symlinkSync(path.relative(path.dirname(foreignPath), brainDir), foreignPath, 'dir');

      const realPath = path.join(repoRoot, '.claude/skills', 'foo');
      fs.mkdirSync(realPath, { recursive: true });
      fs.writeFileSync(path.join(realPath, 'SKILL.md'), '# stale copy');

      const log = makeLogger();
      assert.equal(sync(repoRoot, log, { force: true }), 0);

      for (const targetRel of TARGET_PATHS) {
        const linkedPath = path.join(repoRoot, targetRel, 'foo');
        assert.equal(fs.lstatSync(linkedPath).isSymbolicLink(), true);
        assert.deepEqual(classify(repoRoot, linkedPath, 'foo'), { kind: 'ours', correct: true });
      }
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('returns warning exit code on collisions without force', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tooling-sync-warn-'));
    try {
      const sourceDir = path.join(repoRoot, SOURCE_PATH, 'foo');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# foo');

      const realPath = path.join(repoRoot, '.cursor/skills', 'foo');
      fs.mkdirSync(realPath, { recursive: true });

      const log = makeLogger();
      assert.equal(sync(repoRoot, log), 1);
      assert.equal(fs.lstatSync(realPath).isDirectory(), true);
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('hasMissingLinks', () => {
  it('returns false when there are no source skills', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tooling-missing-'));
    try {
      assert.equal(hasMissingLinks(repoRoot), false);
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('returns true when a source skill is not linked in a target dir', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tooling-missing-'));
    try {
      const sourceDir = path.join(repoRoot, SOURCE_PATH, 'foo');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# foo');

      assert.equal(hasMissingLinks(repoRoot), true);
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('returns false when all source skills are linked in every target dir', () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tooling-missing-'));
    try {
      const sourceDir = path.join(repoRoot, SOURCE_PATH, 'foo');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# foo');

      const log = makeLogger();
      assert.equal(sync(repoRoot, log), 0);
      assert.equal(hasMissingLinks(repoRoot), false);
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('createSkillLink', () => {
  it('creates a directory symlink on POSIX', () => {
    if (process.platform === 'win32') return;

    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tooling-link-'));
    try {
      const sourceDir = path.join(repoRoot, SOURCE_PATH, 'bar');
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# bar');

      const targetDir = path.join(repoRoot, TARGET_PATHS[0]);
      fs.mkdirSync(targetDir, { recursive: true });
      const targetPath = path.join(targetDir, 'bar');

      createSkillLink(repoRoot, targetPath, 'bar');

      assert.equal(fs.lstatSync(targetPath).isSymbolicLink(), true);
      assert.deepEqual(classify(repoRoot, targetPath, 'bar'), { kind: 'ours', correct: true });
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
