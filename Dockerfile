##
# [container] prepare package.json
##
FROM endeveit/docker-jq AS prepackage

WORKDIR /tmp

COPY package.json .

RUN jq '{ dependencies, devDependencies, peerDependencies, resolutions, license, scripts: (.scripts | { postinstall }) }' < package.json > prepare-package.json
# Keep `postinstall` script

##
# [container] Package deps
##
FROM node:22-alpine3.22 AS deps

WORKDIR /deps

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# # Install node dependencies - done in a separate step so Docker can cache it.
# COPY package*.json yarn.lock ./
COPY --from=prepackage /tmp/prepare-package.json ./package.json
COPY yarn.lock ./

RUN yarn install --frozen-lockfile \
	&& yarn cache clean

##
# [container] Build
##
FROM node:22-alpine3.22 AS build

WORKDIR /home/node/app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate \
	&& apk --no-cache add curl

COPY --from=deps /deps/node_modules ./node_modules

COPY . ./
RUN yarn build

##
# [container] Production
##
FROM node:22-alpine3.22 AS prod-deps

WORKDIR /deps

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY --from=prepackage /tmp/prepare-package.json ./package.json
COPY yarn.lock ./

RUN yarn install --frozen-lockfile --production=true \
	&& yarn cache clean

##
# [container] Production
##
FROM node:22-alpine3.22 AS production

WORKDIR /home/node/app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate \
	&& apk --no-cache add curl

ENV NODE_ENV=production

COPY --from=prod-deps /deps/node_modules ./node_modules
COPY --from=build /home/node/app/dist ./dist
COPY --from=build /home/node/app/package.json ./package.json

USER node
# CMD ["node", "dist/main.js"]
CMD ["npm", "run", "start:prod"]
