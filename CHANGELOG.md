# Changelog

## [0.1.2](https://github.com/YSTUty/ystuty-service-schedule/compare/v0.1.1...v0.1.2) (2026-09-18)

### 🧹 Chore

* add `Unsupported` lesson flag if `None` ([98d213a](https://github.com/YSTUty/ystuty-service-schedule/commit/98d213a4334e994cf1cb470797513bf1cdbb738c))
* **cors:** add `content-type` to allowed headers ([fd44554](https://github.com/YSTUty/ystuty-service-schedule/commit/fd4455468035b3793396491cbdf68931b5527f06))
* **docker:** add link `redis` ([171cfcd](https://github.com/YSTUty/ystuty-service-schedule/commit/171cfcd40cd7ba023aa3426fab0ea095cf439046))
* **docker:** update node.js to v22 ([9ba5239](https://github.com/YSTUty/ystuty-service-schedule/commit/9ba52393c7ea30ba0d09bf681cef76fd58a10767))
* **env:** update ([ddad095](https://github.com/YSTUty/ystuty-service-schedule/commit/ddad0951a60a7be9945b3fbe5bb5a7577b05c602))
* fix lint errors ([a27cc41](https://github.com/YSTUty/ystuty-service-schedule/commit/a27cc41532c25cd4aa495242f877f7ba7c1dd80c))
* **husky:** update commit message hook ([b525739](https://github.com/YSTUty/ystuty-service-schedule/commit/b5257391f94b8013635ea6ff49f621a38920b882))
* **main:** update `scalar` api reference ([fc97953](https://github.com/YSTUty/ystuty-service-schedule/commit/fc979539ea7e35493345368a60e3760e870e85c2))
* **oauth:** add `serviceToken` param ([0cb7a4b](https://github.com/YSTUty/ystuty-service-schedule/commit/0cb7a4bb08cd61dcf7b66e7b043662f27632fa24))
* **readme:** update header ([a9eaf53](https://github.com/YSTUty/ystuty-service-schedule/commit/a9eaf53b278f1aa7322dd5c45e74caa9eaee3c47))
* **service:** correct getting groups for `actual_groups` method ([f041c83](https://github.com/YSTUty/ystuty-service-schedule/commit/f041c83a5f302009966a833b4023ebf12b3f83bb))
* **throttler:** update module and add cors exposed headers ([410e2e9](https://github.com/YSTUty/ystuty-service-schedule/commit/410e2e920c7a5f5fc046548d32375f5f9be72d0c))
* update docker & makefile ([7cf4c9e](https://github.com/YSTUty/ystuty-service-schedule/commit/7cf4c9ed4685023962af74824c2a00d5e177ddd4))

### 🚀 Features

* add extend password for `swagger-stats` ([5ac5a22](https://github.com/YSTUty/ystuty-service-schedule/commit/5ac5a22292f8a8578af314019d566c9e3a961beb))
* add nolimit by token scopes ([e7bf124](https://github.com/YSTUty/ystuty-service-schedule/commit/e7bf12402aa8d7ca8b27aa650fa32f02d12981c3))
* **api:** add `scalar` api reference ([cab2a55](https://github.com/YSTUty/ystuty-service-schedule/commit/cab2a556504f5a0d135e5235c74ee79d5fd9519b))
* **api:** enforce response dto serialization ([2c3cd34](https://github.com/YSTUty/ystuty-service-schedule/commit/2c3cd34011ad8bc43cb7e0afeb843ebb885105ea))
* **calendar:** add caldav support for teachers ([9760ba9](https://github.com/YSTUty/ystuty-service-schedule/commit/9760ba98c6c72bff7939e2e48585d566e5a19e38))
* **calendar:** add read-only caldav endpoint ([b06bf46](https://github.com/YSTUty/ystuty-service-schedule/commit/b06bf463432306e5e295c8259ac96ebf840aafdf))
* **common:** add `TransformToClass` for extend ([c410914](https://github.com/YSTUty/ystuty-service-schedule/commit/c410914b9d2060eeaba3f7c0305bb2c4e95687d6))
* **common:** add logger for global error handler and `HttpAndRpcExceptionFilter` ([b406705](https://github.com/YSTUty/ystuty-service-schedule/commit/b406705d43456ac7f70a921be194781196a5d91a))
* **metrics:** add calendar export metrics ([1a8f374](https://github.com/YSTUty/ystuty-service-schedule/commit/1a8f37471dff6ca397ac29e40095fa02a7d00d57))
* **redis:** add connection event logging ([a5dbfbb](https://github.com/YSTUty/ystuty-service-schedule/commit/a5dbfbb1511b5e0ce147143166cf0b3ef12c1cd6))
* **schedule:** add cache ttl metadata ([9bf4cb0](https://github.com/YSTUty/ystuty-service-schedule/commit/9bf4cb07eb72b9b6ec0522d1982205380e8a95a4))
* **schedule:** add method for get semesters info ([34d9115](https://github.com/YSTUty/ystuty-service-schedule/commit/34d9115f1b9b6d38d7deb8fbc099b6e9f1a43999))
* **schedule:** add public semester selection ([254169c](https://github.com/YSTUty/ystuty-service-schedule/commit/254169ca1287ccf1a871a3c4da19d57c2168f560))
* **schedule:** add semester selection and lesson type diagnostics ([83a2951](https://github.com/YSTUty/ystuty-service-schedule/commit/83a295175f0392dd961ed97b7cbdf3adc9e41f2d))
* **schedule:** classify untyped schedule activities ([6da92fb](https://github.com/YSTUty/ystuty-service-schedule/commit/6da92fbc52a3aa74a21c98aba6ba091a0fa1e6e0))
* **throttler:** store rate limits in redis ([2a6a6a2](https://github.com/YSTUty/ystuty-service-schedule/commit/2a6a6a2986ee7b81cce2ffedbd420b89e9006280))

### 🐛 Bug Fixes

* **env:** replace `??` to `||` for numbers ([a63748a](https://github.com/YSTUty/ystuty-service-schedule/commit/a63748a28eec681f2a7619c4b61e75a3c2940f3e))
* **package:** move `@nestjs/typeorm` to deps from dev-deps ([8584224](https://github.com/YSTUty/ystuty-service-schedule/commit/8584224ac5db5539f3f969991f4010e20978db14))
* **redis:** keep requests available when cache fails ([6930df3](https://github.com/YSTUty/ystuty-service-schedule/commit/6930df3c2349dc532fe8df90015f13b54b6a3591))

### 📖 Documentation

* **openapi:** document public api contracts ([4c09509](https://github.com/YSTUty/ystuty-service-schedule/commit/4c09509c97243a3ca240c8e8abd2452b79fddcb3))
* **readme:** update service documentation ([a42947b](https://github.com/YSTUty/ystuty-service-schedule/commit/a42947b3a46726bb5c62b3e998457b7a7dd119bd))

### ☯ Styling

* **prettier:** format code with sorting imports ([844a582](https://github.com/YSTUty/ystuty-service-schedule/commit/844a5826d009ce95c46d5d86d490cbc63105e6c4))

### 🔧 Code Refactoring

* **bootstrap:** remove duplicate module initialization ([7b774a2](https://github.com/YSTUty/ystuty-service-schedule/commit/7b774a2dbfd67b4a64b630acdbfd4bcb2eed38f9))

### 🔨 Build System

* **deps:** upgrade nestjs toolchain and release workflow ([190fe61](https://github.com/YSTUty/ystuty-service-schedule/commit/190fe611c6d9ce747e0211c28d3baf4e8387871c))
* **docker:** replace jq prepackage image ([4fff846](https://github.com/YSTUty/ystuty-service-schedule/commit/4fff846ff82ec796b01c5f9a046e1b6c8b4603c9))
* **node:** standardize nodejs `24` runtime ([a01ab2d](https://github.com/YSTUty/ystuty-service-schedule/commit/a01ab2d66167fe8c9f3ce299ef11c545e0a18f11))

### 🛠️ CI

* add build and deployment workflows ([aad4a9f](https://github.com/YSTUty/ystuty-service-schedule/commit/aad4a9f57bf20082a5d7a1b697398ada07068f15))

### [0.1.1](https://github.com/YSTUty/ystuty-service-schedule/compare/v0.1.0...v0.1.1) (2024-04-25)


### 📈 Chore

* **schedule:** auto combine lessons to stream ([bedcb9f](https://github.com/YSTUty/ystuty-service-schedule/commit/bedcb9fffa6319aa8f9af645c906843797b25260))
* **schedule:** fixs lesson name and groups ([1e761e6](https://github.com/YSTUty/ystuty-service-schedule/commit/1e761e6dda34b2ba39a4f4003e14954a1190a4c5))
* **schedule:** force try auto combine lessons to stream ([926bc16](https://github.com/YSTUty/ystuty-service-schedule/commit/926bc1682d6a8f37b1f851f0c541b15d0514083e))


### 🚀 Features

* add `raspGrWeekView` repository ([9462a10](https://github.com/YSTUty/ystuty-service-schedule/commit/9462a10b9df4ed43759b807a4d0473fb0ff74663))
* **common:** add `OAuth2RequiredScope` decorator ([0983e81](https://github.com/YSTUty/ystuty-service-schedule/commit/0983e8188003fdf83c1654ca153f7365d8ab6448))
* **readme:** add `badge`s with counter ([b23bdfc](https://github.com/YSTUty/ystuty-service-schedule/commit/b23bdfc6dc605421f9267695860ab31277e36b1f))
* **schedule:** add method for get audiences list ([ca8cc0b](https://github.com/YSTUty/ystuty-service-schedule/commit/ca8cc0b0e7a351c465b123107a434b9194796ec1))

## [0.1.0](https://github.com/YSTUty/ystuty-service-schedule/compare/v0.0.1...v0.1.0) (2024-03-18)


### 🐛 Bug Fixes

* **entity:** fix typos in `note` field name for `auditory` ([a797a05](https://github.com/YSTUty/ystuty-service-schedule/commit/a797a05eb7003ac335b268ecea0795b21d288809))


### 🚀 Features

* add `throttler` ([a5dd199](https://github.com/YSTUty/ystuty-service-schedule/commit/a5dd199129e2031edc7f6da419844220c378efbc))
* **calandar:** add getting schedule for `teacher` ([d49044a](https://github.com/YSTUty/ystuty-service-schedule/commit/d49044aa9f12fc48f2e2a51d9f669da89f85a917))
* **calendar:** add `calendar` model for generating `ical` ([8525624](https://github.com/YSTUty/ystuty-service-schedule/commit/85256245726b0f6fef574e063c765601ef29d1b5))
* **calendar:** add `CUSTOM_CALENDAR_URL` for custom ical domain; add versioning ([2b9d540](https://github.com/YSTUty/ystuty-service-schedule/commit/2b9d540a545d7701f6024996f0730769be3438e8))
* **docker:** add docker files (`node:18`) ([feedf2c](https://github.com/YSTUty/ystuty-service-schedule/commit/feedf2c57aa2b30117c4f18d98f6c03f223f7a7a))
* **model:** add `schedule` module ([a4710e1](https://github.com/YSTUty/ystuty-service-schedule/commit/a4710e1d3f77ec10c7b5d8431a14d105d1f34783))
* **redis:** add redis model & add caching for schedule ([7b00d76](https://github.com/YSTUty/ystuty-service-schedule/commit/7b00d76f8ba36c27c8765a45d8a93080abfe738d))
* **schedule:** add `audiences` get method for getting audiences in current semester ([9f72dd8](https://github.com/YSTUty/ystuty-service-schedule/commit/9f72dd8b7aea55afe76132098fc18576411f7973))
* **schedule:** add `count` get method for getting counts in current semester ([25a3663](https://github.com/YSTUty/ystuty-service-schedule/commit/25a3663f29a9408fa4ab0c2978914474808d0d9b))
* **schedule:** add `teachers` get method for getting teachers in current semester ([f446659](https://github.com/YSTUty/ystuty-service-schedule/commit/f446659d5c655fa6c1301551c399a1646b82cdbb))
* **schedule:** add dto and update swagger decorators ([6e96181](https://github.com/YSTUty/ystuty-service-schedule/commit/6e96181f35ede0baebd21da5d5f9327d880788d0))
* **schedule:** add getting schedule for audiences ([f9ac8e6](https://github.com/YSTUty/ystuty-service-schedule/commit/f9ac8e69182290d1db8b2c0eb00dfc1c7e125bda))
* **schedule:** add getting schedule for teacher ([a3edb00](https://github.com/YSTUty/ystuty-service-schedule/commit/a3edb007e14a92c441ca0c9c13bff6b5e306f476))


### 📈 Chore

* add swagger doc version from package ver ([20dee56](https://github.com/YSTUty/ystuty-service-schedule/commit/20dee569d47e25f52d49941cde2a0ba65a716999))
* change emoji for `feat` type ([3eccdca](https://github.com/YSTUty/ystuty-service-schedule/commit/3eccdca978d77ca9d4cedfbeaf50eec4b4254112))
* **controller:** add version for `schedule` ([0334074](https://github.com/YSTUty/ystuty-service-schedule/commit/0334074715e53281b5bbe701f0ca5b7886a0c013))
* disable `api` prefix ([0c52462](https://github.com/YSTUty/ystuty-service-schedule/commit/0c52462393de7abd85872ad0179d811963c7fdff))
* **readme:** update ([a6760cf](https://github.com/YSTUty/ystuty-service-schedule/commit/a6760cf9a2a8444212dffff1a458fdaa3f70fbfe))
* **schedule:** change params order of `getByGroup` ([6d1ff67](https://github.com/YSTUty/ystuty-service-schedule/commit/6d1ff67caf831778ba2c57230320504b39e29bd7))
* **schedule:** remove unnecessary interfaces for `teacher` & `audience` ([3d05d0f](https://github.com/YSTUty/ystuty-service-schedule/commit/3d05d0f6d0966c4643fe54ec10011a527d119aae))
* **schedule:** rename `lesson` field `time` to `timeRange` ([ab4cc6a](https://github.com/YSTUty/ystuty-service-schedule/commit/ab4cc6a3cec5e731f56bd60a6a6535e4482b88be))
* **schedule:** update caching of groups list for `getGroups` method ([c892b4f](https://github.com/YSTUty/ystuty-service-schedule/commit/c892b4fc0604216d9001155af8c90b2c8ea1163d))

### 0.0.1 (2024-02-18)


### 🚀 Features

* **project:** init ([9741f55](https://github.com/YSTUty/ystuty-service-schedule/commit/9741f55d41161aaf26ab9b98d5c412d421b827f8))
