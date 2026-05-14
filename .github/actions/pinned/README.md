# Pinned third-party GitHub Actions

Workflows and other composites call `./.github/actions/pinned/<name>` instead of `owner/repo@tag`.  
Each wrapper runs a **single** `uses: owner/repo@<full_commit_sha>` so the digest is defined in **one** place per upstream action.

Some actions expose **dynamic step outputs** (for example `dorny/paths-filter`). Those cannot be wrapped in a composite without listing every output, so they stay as a **single** `uses: owner/repo@<sha>` line in the workflow that needs them (`tests.yml`).

`actions/github-script` is pinned the same way where a step `id` must read script outputs (`community-label.yml`).

| Wrapper                        | Upstream                                                                                                  | Tag / ref | Commit                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------ |
| _(workflow only)_              | [dorny/paths-filter](https://github.com/dorny/paths-filter)                                               | v4.0.1    | `fbd0ab8f3e69293af611ebaee6363fc25e6d187d` |
| _(workflow only)_              | [actions/github-script](https://github.com/actions/github-script)                                         | v9.0.0    | `3a2844b7e9c422d3c10d287c895573f7108da1b3` |
| `checkout`                     | [actions/checkout](https://github.com/actions/checkout)                                                   | v6.0.2    | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` |
| `checkout-ref`                 | actions/checkout                                                                                          | v6.0.2    | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` |
| `setup-node`                   | [actions/setup-node](https://github.com/actions/setup-node)                                               | v6.4.0    | `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` |
| `cache`                        | [actions/cache](https://github.com/actions/cache)                                                         | v5.0.5    | `27d5ce7f107fe9357f9df03efb73ab90386fccae` |
| `upload-artifact`              | [actions/upload-artifact](https://github.com/actions/upload-artifact)                                     | v7.0.1    | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `download-artifact`            | [actions/download-artifact](https://github.com/actions/download-artifact)                                 | v8.0.1    | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` |
| `nx-set-shas`                  | [nrwl/nx-set-shas](https://github.com/nrwl/nx-set-shas)                                                   | v5.0.1    | `afb73a62d26e41464e9254689e1fd6122ee683c1` |
| `create-github-app-token`      | [actions/create-github-app-token](https://github.com/actions/create-github-app-token)                     | v3.2.0    | `bcd2ba49218906704ab6c1aa796996da409d3eb1` |
| `get-user-teams-membership`    | [tspascoal/get-user-teams-membership](https://github.com/tspascoal/get-user-teams-membership)             | v4.0.1    | `818140d631d5f29f26b151afbe4179f87d9ceb5e` |
| `comment-pull-request`         | [thollander/actions-comment-pull-request](https://github.com/thollander/actions-comment-pull-request)     | v3.0.1    | `24bffb9b452ba05a4f3f77933840a6a841d1b32b` |
| `gh-pages`                     | [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)                               | v4.1.0    | `84c30a85c19949d7eee79c4ff27748b70285e453` |
| `browserslist-update`          | [c2corg/browserslist-update-action](https://github.com/c2corg/browserslist-update-action)                 | v2.5.0    | `a76abb476199caea5399f9e28ff3f16e491ec566` |
| `compressed-size`              | [preactjs/compressed-size-action](https://github.com/preactjs/compressed-size-action)                     | 2.9.1     | `66325aad6443cb7cf89c4bfcd414aea2367cda94` |
| `trunk-analytics-uploader`     | [trunk-io/analytics-uploader](https://github.com/trunk-io/analytics-uploader)                             | v2.0.8    | `95a0fb8b29e45b6068304261fb518644b426a803` |
| `sonarqube-scan`               | [SonarSource/sonarqube-scan-action](https://github.com/SonarSource/sonarqube-scan-action)                 | v8.0.0    | `59db25f34e16620e48ab4bb9e4a5dce155cb5432` |
| `sonarqube-quality-gate`       | [SonarSource/sonarqube-quality-gate-action](https://github.com/SonarSource/sonarqube-quality-gate-action) | v1.2.0    | `cf038b0e0cdecfa9e56c198bbb7d21d751d62c3b` |
| `stale`                        | [actions/stale](https://github.com/actions/stale)                                                         | v10.2.0   | `b5d41d4e1d5dceea10e7104786b73624c18a190f` |
| `claude-code-action`           | [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)                         | v1        | `f4fb5c6cdccc1ee7af63692f5d08d56efaa64cc8` |
| `claude-code-action-mcp`       | [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)                         | v1        | `f4fb5c6cdccc1ee7af63692f5d08d56efaa64cc8` |
| `issues-helper/create-comment` | [actions-cool/issues-helper](https://github.com/actions-cool/issues-helper)                               | v3.8.0    | `200c78641dbf33838311e5a1e0c31bbdb92d7cf0` |
| `issues-helper/close-issue`    | actions-cool/issues-helper                                                                                | v3.8.0    | `200c78641dbf33838311e5a1e0c31bbdb92d7cf0` |
| `issues-helper/lock-issue`     | actions-cool/issues-helper                                                                                | v3.8.0    | `200c78641dbf33838311e5a1e0c31bbdb92d7cf0` |
| `issues-helper/close-issues`   | actions-cool/issues-helper                                                                                | v3.8.0    | `200c78641dbf33838311e5a1e0c31bbdb92d7cf0` |

To bump a pin: resolve the new tag to a SHA (`gh api repos/OWNER/REPO/commits/TAG`), update the wrapper’s `uses:` line and this table.
