export async function toggleRateLimiting(page, enabled = true) {
  const response = await page.request.fetch('/api/config/ratelimit/enable', {
    method: 'POST',
    data: { value: enabled },
  });
  if (!response.ok()) {
    throw new Error(
      `toggleRateLimiting failed with status ${response.status()}: ${await response.text()}`
    );
  }
}

export async function prunePermissions(page) {
  const response = await page.request.fetch('/api/config/permissions/prune', {
    method: 'POST',
  });
  if (!response.ok()) {
    throw new Error(
      `prunePermissions failed with status ${response.status()}: ${await response.text()}`
    );
  }
}
