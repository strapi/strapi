// no-code-e2e: scenario=tests-next/ui/scenarios/settings/create-api-token.md id=settings-create-api-token hash=6ccdb1d7a990
// Generated from tests-next/ui/scenarios/settings/create-api-token.md. Do not edit by hand: change the scenario instead.
import { expect, test } from '../../../fixtures';
import { ApiTokenPage, ApiTokensPage } from '../../../pages';

test(
  'creates a read-only API token with an unlimited duration',
  { tag: ['@extended'] },
  async ({ page, unique }) => {
    const tokens = new ApiTokensPage(page);
    const token = new ApiTokenPage(page);
    const name = unique('PoC read-only');

    await tokens.goto();
    await tokens.addToken();
    await token.expectCreateFormReady();
    await token.fill({ name, duration: 'Unlimited', type: 'Read-only' });
    await token.save();

    // The token's value shows after the creation.
    await expect(token.tokenValue).toBeVisible();

    await token.goBack();
    await expect(tokens.heading).toBeVisible();

    // The token shows in the list.
    await expect(tokens.row(name)).toBeVisible();

    await tokens.openToken(name);

    // On the token's page, the token type is "Read-only".
    await expect(token.heading(name)).toBeVisible();
    await expect(token.type).toHaveText('Read-only');
  }
);
