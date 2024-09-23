export async function toggleRateLimiting(page, enabled = true) {
  await page.request.fetch('/api/config/ratelimit/enable', {
    method: 'POST',
    data: { value: enabled },
  });
}

export async function prunePermissions(page) {
  await page.request.fetch('/api/config/permissions/prune', {
    method: 'POST',
  });
}
