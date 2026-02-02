yarn dlx lockfile-lint \
    --type $LOCKFILE_TYPE \
    --path $LOCKFILE_PATH \
    --allowed-hosts $LOCKFILE_ALLOWED_HOSTS \
    --allowed-urls $LOCKFILE_ALLOWED_URLS \
    --allowed-schemes "npm:" "workspace:" "patch:" "https:"
