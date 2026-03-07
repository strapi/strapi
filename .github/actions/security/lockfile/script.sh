if [ "$LOCKFILE_TYPE" = "pnpm" ]; then
  corepack enable
  pnpm audit --audit-level=moderate
else
  yarn dlx lockfile-lint \
    --type $LOCKFILE_TYPE \
    --path $LOCKFILE_PATH \
    --allowed-hosts $LOCKFILE_ALLOWED_HOSTS \
    --allowed-urls $LOCKFILE_ALLOWED_URLS \
    --allowed-schemes "npm:" "workspace:" "patch:" "https:"
fi
