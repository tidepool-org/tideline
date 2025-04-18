# syntax=docker/dockerfile:experimental

### Stage: Base image
FROM node:20.8.0-alpine as base
WORKDIR /app
RUN corepack enable \
  && yarn set version 3.6.4 \
  && mkdir -p dist node_modules .yarn/cache && chown -R node:node .


### Stage: Test
FROM base as test
ENV \
  CHROME_BIN=/usr/bin/chromium-browser \
  NODE_ENV=test
USER root
RUN apk add --no-cache chromium && rm -rf /var/cache/apk/* /tmp/*
USER node
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    --mount=type=bind,source=.yarnrc.yml,target=.yarnrc.yml \
    --mount=type=cache,target=.yarn/cache,uid=1000,gid=1000 \
    yarn install --immutable
COPY . .
RUN npm run test
