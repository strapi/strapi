const { isLatestV4Alias } = require('./resolve-strapi-version');

/**
 * Build an in-memory scenario from CLI flags (same shape as JSON scenarios).
 */

function slugVersion(v: string): string {
  return String(v).replace(/\./g, '-');
}

function initialMajor(version: string): number {
  if (isLatestV4Alias(version)) {
    return 4;
  }
  const m = Number(String(version).split('.')[0]);
  return Number.isFinite(m) ? m : NaN;
}

type BuildScenarioArgv = {
  initial: string;
  via: string[];
  validators?: string | null;
};

type ScenarioStage = {
  id: string;
  type: string;
  version?: string;
  validate?: string[];
};

type BuiltScenario = {
  id: string;
  description: string;
  dataOrigin: string;
  baseline: {
    type: string;
    initialVersion: string;
  };
  stages: ScenarioStage[];
};

function buildScenarioFromFlags(argv: BuildScenarioArgv): BuiltScenario {
  const initial = String(argv.initial || '').trim();
  if (!initial) {
    throw new Error('buildScenarioFromFlags: initial version is required');
  }
  const major = initialMajor(initial);
  if (major !== 4 && major !== 5) {
    throw new Error(
      `--initial must be Strapi 4.x (v4 scaffold), 5.x (pinned app + seed-v5), or \`legacy\` (latest v4 from npm). Got "${initial}".`
    );
  }

  const via = Array.isArray(argv.via) ? argv.via : [];
  const id = `cli-${slugVersion(initial)}${via.length ? `-via-${via.map(slugVersion).join('-')}` : ''}-workspace`;

  const stages: ScenarioStage[] = via.map((version) => ({
    id: `pinned-${version}`,
    type: 'strapi-pinned',
    version,
  }));

  const defaultValidators = pickDefaultValidators(major, via);
  const validate = parseValidatorsArg(argv.validators, defaultValidators);
  const dataOrigin = major === 5 ? 'v5' : 'v4';

  stages.push({
    id: 'workspace',
    type: 'workspace',
    validate,
  });

  if (major === 4) {
    return {
      id,
      description: 'Built from CLI flags',
      dataOrigin: 'v4',
      baseline: {
        type: 'v4-scaffold',
        initialVersion: initial,
      },
      stages,
    };
  }

  return {
    id,
    description: 'Built from CLI flags',
    dataOrigin,
    baseline: {
      type: 'v5-pinned',
      initialVersion: initial,
    },
    stages,
  };
}

function pickDefaultValidators(initialMajorNum: number, via: string[]): string[] {
  if (via.length > 0) {
    return ['full-ladder'];
  }
  if (initialMajorNum === 5) {
    return ['full-v5-origin'];
  }
  return ['full-v4-origin'];
}

function parseValidatorsArg(raw: string | null | undefined, defaultValidators: string[]): string[] {
  if (raw == null || String(raw).trim() === '') {
    return defaultValidators;
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  buildScenarioFromFlags,
  initialMajor,
  pickDefaultValidators,
};
