'use strict';

const fs = require('fs');
const { extractPackageUsages, groupUsagesByKey } = require('./extract-usages');

const analyzePackage = (packageConfig) => {
  const enTranslations = JSON.parse(fs.readFileSync(packageConfig.enJsonPath, 'utf8'));
  const usages = extractPackageUsages(packageConfig);
  const groupedUsages = groupUsagesByKey(usages);

  const issues = {
    missingFromEn: [],
    valueMismatch: [],
    conflictingDefaultMessages: [],
    dynamicIds: [],
    parseErrors: [],
    missingDefaultMessage: [],
  };

  usages.forEach((usage) => {
    if (usage.type === 'parse-error') {
      issues.parseErrors.push(usage);
      return;
    }

    if (usage.type === 'external-id') {
      return;
    }

    if (usage.type === 'dynamic-id' || usage.dynamic) {
      issues.dynamicIds.push(usage);
    }
  });

  groupedUsages.forEach((keyUsages, enKey) => {
    const defaultMessages = [
      ...new Set(
        keyUsages
          .map((usage) => usage.defaultMessage)
          .filter((defaultMessage) => defaultMessage !== undefined)
      ),
    ];

    if (defaultMessages.length > 1) {
      issues.conflictingDefaultMessages.push({
        enKey,
        defaultMessages,
        usages: keyUsages,
      });
    }

    const defaultMessage = defaultMessages[0];

    if (!(enKey in enTranslations)) {
      issues.missingFromEn.push({
        enKey,
        defaultMessage,
        usages: keyUsages,
      });
      return;
    }

    if (defaultMessage === undefined) {
      issues.missingDefaultMessage.push({
        enKey,
        usages: keyUsages,
      });
      return;
    }

    if (enTranslations[enKey] !== defaultMessage) {
      issues.valueMismatch.push({
        enKey,
        expected: defaultMessage,
        actual: enTranslations[enKey],
        usages: keyUsages,
      });
    }
  });

  return {
    packageConfig,
    enTranslations,
    usages,
    issues,
  };
};

module.exports = {
  analyzePackage,
};
