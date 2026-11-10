FROM node:26-trixie-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && install -d -m 755 /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && chmod 644 /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@10.32.1

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/gh-prs-inbox/package.json packages/gh-prs-inbox/package.json
RUN pnpm --filter @webhook-objects/gh-prs-inbox... install --frozen-lockfile --config.enableGlobalVirtualStore=false

COPY --chown=node:node packages/gh-prs-inbox/src packages/gh-prs-inbox/src
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/gh-prs-inbox-entrypoint

USER node
WORKDIR /app/packages/gh-prs-inbox
ENTRYPOINT ["gh-prs-inbox-entrypoint"]
