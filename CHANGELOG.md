# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
