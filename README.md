<p align="center"><img src="https://ystuty.github.io/docs/assets/img/YSTUty_logo-text-without-bg-shadow.png" width="150"></p>

<p align="center">
  <img src="https://img.shields.io/github/package-json/v/YSTUty/ystuty-service-schedule?style=flat-square" alt="GitHub package.json version"/>
  <img src="https://img.shields.io/github/last-commit/YSTUty/ystuty-service-schedule?style=flat-square" alt="GitHub last commit"/>
  <br/>
  <a href="https://vk.com/ss_ystu"><img src="https://img.shields.io/badge/Bot-Use now-9cf?style=flat-square&logo=vk" alt="vk.com/ss_ystu"/></a>
  <a href="https://t.me/ss_ystu_bot"><img src="https://img.shields.io/badge/Bot-Use now-229ED9?style=flat-square&logo=telegram" alt="t.me/ss_ystu_bot"/></a>
  <br/>
  <!-- <img src="https://img.shields.io/badge/dynamic/json?color=ced&style=flat-square&logo=GraphQL&label=Доступно групп&suffix= 🎓&query=$.groups&url=https://gg-api.ystuty.ru/s/schedule/v1/schedule/count" alt="Number of available groups"/> -->
  <!-- <img src="https://img.shields.io/badge/dynamic/json?color=ced&style=flat-square&logo=GraphQL&label=Доступно преподавателей&suffix= 👨‍🏫&query=$.teachers&url=https://gg-api.ystuty.ru/s/schedule/v1/schedule/count" alt="Number of available teachers"/> -->
  <img src="https://img.shields.io/badge/dynamic/json?color=ced&style=flat-square&logo=GraphQL&label=%D0%94%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%BD%D0%BE%20%D0%B3%D1%80%D1%83%D0%BF%D0%BF&suffix=%20%F0%9F%8E%93&query=$.groups&url=https://gg-api.ystuty.ru/s/schedule/v1/schedule/count" alt="Number of available groups"/>
  <img src="https://img.shields.io/badge/dynamic/json?color=ced&style=flat-square&logo=GraphQL&label=%D0%94%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%BD%D0%BE%20%D0%BF%D1%80%D0%B5%D0%BF%D0%BE%D0%B4%D0%B0%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D0%B5%D0%B9&suffix=%20%F0%9F%91%A8%E2%80%8D%F0%9F%8F%AB&query=$.teachers&url=https://gg-api.ystuty.ru/s/schedule/v1/schedule/count" alt="Number of available teachers"/>
  <br/>
  <a href="https://view.ystuty.ru" target="_blank"><img src="https://img.shields.io/badge/Viwe%20schedule-YSTUty-9cf?style=flat-square&logo=Internet%20Explorer" alt="view.ystuty.ru"/></a>
</p>

# [YSTUty.Service] Schedule API
> Сервис для получения списка групп и расписания

> TODO: Импорт расписания в календарь. (с токеном, для автоматического обновления группы студента каждый курс)

## Используется в
  * [[YSTUty] Schedule Web view](https://github.com/YSTUty/ystuty-schedule-web-view#readme): Решение для визуализации данных в виде календаря
  * [[YSTUty] Schedule bot](https://github.com/YSTUty/ystuty-schedule-bot#readme): Решение в виде бота для мессенджеров Telegram и VK
> Если вы хотите добавить свой проект в список, создайте [новую тему](https://github.com/YSTUty/ystuty-service-schedule/issues/new) в репозитории.

<hr/>

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
