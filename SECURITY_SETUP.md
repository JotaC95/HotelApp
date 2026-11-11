# Secure configuration

The previously committed Django secret must be treated as exposed. Generate a new secret and set `DJANGO_SECRET_KEY` in the deployment environment. Do not reuse the old key. The key is still present in Git history until a separately coordinated history rewrite.

Set `DJANGO_ALLOWED_HOSTS` to the production hostname(s), `DEBUG=false`, and `CORS_ALLOW_ALL_ORIGINS=false`. If a frontend needs cross-origin access, configure explicit allowed origins rather than allowing all origins.

Example local setup (replace placeholder values):

```sh
export DJANGO_SECRET_KEY='replace-with-new-random-key'
export DJANGO_ALLOWED_HOSTS='localhost,127.0.0.1'
export DEBUG=false
export CORS_ALLOW_ALL_ORIGINS=false
```

Changing the signing key may invalidate existing sessions and signed tokens. Verify deployment settings and tests before merging.
