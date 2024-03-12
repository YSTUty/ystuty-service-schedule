##
# [container] prepare package.json
##
FROM endeveit/docker-jq AS prePackage

COPY package.json /tmp

RUN jq '{ dependencies, devDependencies, peerDependencies, resolutions, license, scripts: (.scripts | { postinstall }) }' < /tmp/package.json > /tmp/prepare-package.json
# Keep `postinstall` script

##
# [container] Package deps
##
FROM node:18-alpine AS deps

WORKDIR /deps

# # Install node dependencies - done in a separate step so Docker can cache it.
# COPY package*.json yarn.lock ./
COPY --from=prePackage /tmp/prepare-package.json ./package.json
COPY yarn.lock ./

RUN yarn install --pure-lockfile; \
    yarn cache clean

##
# [container] Base
##
FROM node:18-alpine AS base

WORKDIR /home/node/app

# Install dependencies via apk
RUN apk --update --no-cache add curl

COPY --from=deps /deps/node_modules ./node_modules

COPY . ./

##
# [container] Production
##
FROM base AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN yarn build
