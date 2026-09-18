<p align="center"><img src="https://ystuty.github.io/docs/assets/img/YSTUty_logo-text-without-bg-shadow.png" width="150"></p>

<p align="center">
  <img src="https://img.shields.io/github/package-json/v/YSTUty/ystuty-service-schedule?style=flat-square" alt="GitHub package.json version"/>
  <img src="https://img.shields.io/github/last-commit/YSTUty/ystuty-service-schedule?style=flat-square" alt="GitHub last commit"/>
  <br/>
  <a href="https://vk.com/ss_ystu"><img src="https://img.shields.io/badge/Bot-Use%20in%20VK-2787F5?style=flat-square&logo=vk" alt="Открыть бота во VK"/></a>
  <a href="https://t.me/ss_ystu_bot"><img src="https://img.shields.io/badge/Bot-Use%20in%20Telegram-229ED9?style=flat-square&logo=telegram" alt="Открыть бота в Telegram"/></a>
  <br/>
  <img src="https://img.shields.io/badge/dynamic/json?color=ced&style=flat-square&logo=GraphQL&label=%D0%94%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%BD%D0%BE%20%D0%B3%D1%80%D1%83%D0%BF%D0%BF&suffix=%20%F0%9F%8E%93&query=$.groups&url=https://gg-api.ystuty.ru/s/schedule/v1/schedule/count" alt="Количество доступных групп"/>
  <img src="https://img.shields.io/badge/dynamic/json?color=ced&style=flat-square&logo=GraphQL&label=%D0%94%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%BD%D0%BE%20%D0%BF%D1%80%D0%B5%D0%BF%D0%BE%D0%B4%D0%B0%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D0%B5%D0%B9&suffix=%20%F0%9F%91%A8%E2%80%8D%F0%9F%8F%AB&query=$.teachers&url=https://gg-api.ystuty.ru/s/schedule/v1/schedule/count" alt="Количество доступных преподавателей"/>
  <br/>
  <a href="https://view.ystuty.ru"><img src="https://img.shields.io/badge/View%20schedule-YSTUty-9cf?style=flat-square&logo=Internet%20Explorer" alt="view.ystuty.ru"/></a>
</p>

# [YSTUty.Service] Schedule API

REST API с расписанием ЯГТУ. Сервис получает данные из MSSQL расписания,
отдаёт их клиентам и формирует календари для импорта.

## Возможности

- расписание групп, преподавателей и аудиторий;
- список актуальных групп, преподавателей, аудиторий и семестров;
- экспорт расписания в iCalendar (`.ical`);
- CalDAV-доступ к календарям групп и преподавателей;
- OAuth2-защита закрытых методов и rate limit;
- OpenAPI-документация: `/swagger`, `/reference`, `/swagger-json`;
- Prometheus-метрики: `/metrics`.

## Используется в

- [[YSTUty] Schedule Web view](https://github.com/YSTUty/ystuty-schedule-web-view#readme) — визуализация расписания;
- [[YSTUty] Schedule bot](https://github.com/YSTUty/ystuty-schedule-bot#readme) — бот для Telegram и VK.

## Запуск для разработки

Для работы нужны MSSQL с данными расписания, Redis и настройки из
[`.env.example`](.env.example). Обязателен `TYPEORM_HOST`; остальные параметры
подберите для локального окружения.

```bash
yarn
yarn start:dev
```

Приложение использует Node.js 24.x и Yarn 1.22.x.

## Календарь

Публичный iCalendar доступен по адресам:

```text
/v1/calendar/group/:groupName.ical
/v1/calendar/teacher/:teacherId.ical
```

CalDAV повторяет структуру iCalendar:

```text
/v1/calendar/caldav/group/:groupName
/v1/calendar/caldav/teacher/:teacherId
```

Клиенту требуется Basic Auth с непустым логином; пароль не проверяется. Это
формальная авторизация для совместимости с календарными приложениями, а не
проверка пользователя.

## Метрики

`/metrics` включён по умолчанию и содержит стандартные process-метрики, а также
счётчики и длительность запросов iCalendar/CalDAV. Для Prometheus укажите
уникальное имя инстанса:

```env
INSTANCE_NAME=ystuty-service-schedule
```

Метрики по конкретным группам и преподавателям выключены, чтобы не создавать
неограниченное число time series. Включайте их только при необходимости:

```env
PROMETHEUS_DETAILED_CALENDAR_TARGET_METRICS=true
```

## Проверки

```bash
yarn build
yarn lint
yarn typecheck
yarn test
```

## License

[MIT](LICENSE)
