# Frontend Audit

Дата: 2026-04-10

Основа разбора:
- текущая структура `react-router` + `@tanstack/react-query`
- текущие data routes для `groups`, `standards`, `images`
- Vercel React Best Practices
- Vercel Web Interface Guidelines

## Короткий вердикт

Фронт не развален полностью. База у вас уже нормальная:
- есть явный роутинг
- есть единый `queryClient`
- есть понятный API-слой по фичам
- есть общий `QueryState`
- image editor уже оформлен как отдельный data-heavy экран

Проблема не в том, что все плохо. Проблема в том, что сейчас смешаны 3 разные модели работы с данными:
- route loader только валидирует params
- route loader префетчит данные в cache
- компонент сам решает, что грузить, а часть данных получает через `Outlet context`

Из-за этого проект ощущается как клубок: на каждом новом экране надо заново угадывать, кто владеет данными страницы.

## Что уже реально нормально

### 1. Отдельный query layer

Норм:
- [`client/src/lib/query-client.ts`](/home/user/photo-standards-db/client/src/lib/query-client.ts)
- [`client/src/lib/react-query.ts`](/home/user/photo-standards-db/client/src/lib/react-query.ts)
- [`client/src/lib/query-keys.ts`](/home/user/photo-standards-db/client/src/lib/query-keys.ts)

Почему это хорошо:
- есть единый `QueryClient`
- есть глобальная обработка ошибок
- query keys централизованы
- мутации и запросы разложены по feature-area

Это правильная база. Ее надо не ломать, а дисциплинировать.

### 2. Image route как отдельный data route

Хороший кусок:
- [`client/src/app/router.tsx#L79`](/home/user/photo-standards-db/client/src/app/router.tsx#L79)
- [`client/src/app/routes/images/images.tsx#L19`](/home/user/photo-standards-db/client/src/app/routes/images/images.tsx#L19)

Почему это уже близко к правильной модели:
- route валидирует `groupId`, `standardId`, `imageId`
- route заранее прогревает cache через `ensureQueryData`
- экран потом читает данные через те же query hooks
- есть отдельные fallback/error элементы для тяжелой страницы

Это лучший текущий паттерн в проекте.

### 3. Фичи разложены по domain slices

Норм:
- `page-components/groups/*`
- `page-components/standards/*`
- `page-components/segments/*`

Это сильно лучше, чем один общий `api.ts` и один общий `components` на весь проект.

## Где реально начинается грязь

### 1. Нет единого правила владения данными страницы

Сейчас:
- `group-detail` сам грузит группу через query hook: [`client/src/app/routes/groups/group-detail.tsx#L21`](/home/user/photo-standards-db/client/src/app/routes/groups/group-detail.tsx#L21)
- `standard-detail` получает группу через `Outlet context`, но стандарт грузит сам: [`client/src/app/routes/groups/standard-detail.tsx#L8`](/home/user/photo-standards-db/client/src/app/routes/groups/standard-detail.tsx#L8)
- `images` получает ids через loader, но реальные данные повторно читает через query hooks после loader-prefetch: [`client/src/app/routes/images/images.tsx#L21`](/home/user/photo-standards-db/client/src/app/routes/images/images.tsx#L21)

То есть сейчас одновременно используются:
- params-only loader
- prefetch loader
- parent-owned data
- component-owned data

Это главная архитектурная проблема.

### 2. `groups -> standard detail` сделан как полу-роут, полу-аккордеон

Сейчас `standard-detail` по сути не отдельная страница, а режим раскрытия карточки:
- [`client/src/app/routes/groups/standard-detail.tsx#L12`](/home/user/photo-standards-db/client/src/app/routes/groups/standard-detail.tsx#L12)
- [`client/src/page-components/standards/components/standards-section.tsx#L27`](/home/user/photo-standards-db/client/src/page-components/standards/components/standards-section.tsx#L27)

Маршрут есть, но UI ведет себя как локальный expandable list.

Это не ужасно, если это осознанное решение. Но пока это выглядит как промежуточный компромисс:
- URL говорит: "открыта сущность standard"
- layout говорит: "это просто тот же список, только одна карточка раскрыта"
- данные говорят: "детали стандарта грузятся отдельно только для раскрытой карточки"

Если позже этот экран пойдет в инспекцию как список, это можно сохранить. Но тогда нужно прямо признать паттерн:
- `standard-detail` это route-driven disclosure panel
- а не "почти отдельная detail page"

### 3. Router loaders используются непоследовательно

Сравнение:
- `group-detail` loader только вытаскивает `groupId`: [`client/src/app/router.tsx#L46`](/home/user/photo-standards-db/client/src/app/router.tsx#L46)
- `standard-detail` loader только вытаскивает `standardId`: [`client/src/app/router.tsx#L63`](/home/user/photo-standards-db/client/src/app/router.tsx#L63)
- `images` loader уже валидирует и префетчит весь экран: [`client/src/app/router.tsx#L83`](/home/user/photo-standards-db/client/src/app/router.tsx#L83)

Итог:
- одно и то же понятие `loader` означает разные уровни ответственности
- нельзя быстро понять, когда экран должен уметь стартовать без спиннера, а когда нет

### 4. Query hooks имеют разный уровень зрелости

Есть аккуратный вариант:
- [`client/src/page-components/groups/api/get-group.ts#L10`](/home/user/photo-standards-db/client/src/page-components/groups/api/get-group.ts#L10)
- [`client/src/page-components/standards/api/get-image.ts#L10`](/home/user/photo-standards-db/client/src/page-components/standards/api/get-image.ts#L10)

И менее аккуратный вариант:
- [`client/src/page-components/standards/api/get-standard.ts#L10`](/home/user/photo-standards-db/client/src/page-components/standards/api/get-standard.ts#L10)

Проблемы у `get-standard.ts`:
- не использует `queryOptions`
- наружу торчит `enabled`, но вызывающий все равно делает `id!`
- есть `defaultStandard`, который сейчас не формирует контракт страницы и выглядит как лишний шум

Это мелочь, но именно такие мелочи делают слой запросов визуально нестабильным.

### 5. Инвалидация cache частично нормальная, частично слишком общая

Нормально:
- после аннотации инвалидируется image + standard: [`client/src/page-components/segments/api/annotate-segment.ts#L32`](/home/user/photo-standards-db/client/src/page-components/segments/api/annotate-segment.ts#L32)

Слишком широко:
- `setReference` инвалидирует весь список групп: [`client/src/page-components/standards/api/set-reference.ts#L22`](/home/user/photo-standards-db/client/src/page-components/standards/api/set-reference.ts#L22)
- `updateStandard` тоже инвалидирует весь список групп: [`client/src/page-components/standards/api/update-standard.ts#L32`](/home/user/photo-standards-db/client/src/page-components/standards/api/update-standard.ts#L32)

Иногда это оправдано, но как дефолт это значит:
- лишние refetch
- скрытая связность между feature-областями
- труднее понять, какие экраны реально зависят от какого события

### 6. `QueryState` хороший, но им начали затыкать все подряд

Файл:
- [`client/src/components/ui/query-state/query-state.tsx#L82`](/home/user/photo-standards-db/client/src/components/ui/query-state/query-state.tsx#L82)

Что хорошо:
- единый рендер состояний

Что опасно:
- им очень легко замаскировать отсутствие нормальной data ownership модели
- разные страницы показывают спиннеры и empty/error не потому, что это UX-решение, а потому что непонятно, кто должен гарантировать готовность данных

`QueryState` должен быть инструментом отображения состояния, а не архитектурным костылем.

## Что из этого норм, а что нет

### Нормально

- router loader валидирует params и делает redirect
- router loader префетчит критичные данные тяжелого экрана
- route component использует `useQuery` даже после loader-prefetch, если query cache уже прогрет
- parent route отдает дочерним компонентам уже загруженные данные через `Outlet context`
- feature-local hooks для запросов и мутаций
- optimistic update в image editor через `setQueryData`: [`client/src/app/routes/images/images.tsx#L103`](/home/user/photo-standards-db/client/src/app/routes/images/images.tsx#L103)

### Не нормально

- в одной ветке роутов каждый экран живет по разным правилам data ownership
- route существует как страница, но фактически это только UI-состояние раскрытия карточки
- тяжелые экраны префетчат данные в loader, а соседние экраны оставлены на клиентские спиннеры без явной причины
- query layer оформлен в разном стиле
- глобальная инвалидация списков используется как удобная дубина вместо точной модели зависимостей

## Правила, которые нужно ввести

Ниже не “рекомендации”, а рабочий контракт.

### Правило 1. У каждой route page должен быть один владелец данных

Варианты только такие:
- route loader владеет подготовкой данных страницы
- parent route владеет данными и передает их вниз
- page component сам владеет своими query hooks

Нельзя смешивать все три варианта в пределах одной и той же page-модели без явной причины.

### Правило 2. Loader нужен не для всего, а только для page-critical данных

Использовать loader, если без данных нельзя вообще отрендерить экран:
- image editor
- полноценная detail page
- экран, где нужен redirect до первого paint

Не использовать loader для вторичных блоков:
- раскрывашка карточки
- таб, который может спокойно показать локальный skeleton
- побочная панель

### Правило 3. Если экран route-driven, его состояние обязано читаться из URL

У вас это уже частично есть:
- раскрытие стандарта завязано на `standardId` в URL

Это хороший путь, если вы реально хотите использовать этот экран как список в инспекции.

Тогда надо официально закрепить:
- список стандартов остается основным экраном
- `standardId` в URL управляет только раскрытой карточкой
- details подгружаются только для активной карточки
- это не "detail page", а "list with route-driven expansion"

### Правило 4. Для image/editor-like экранов использовать Data Route Pattern

Контракт:
- router loader валидирует params
- router loader делает `queryClient.ensureQueryData(...)` для критичных query
- route component читает только ids из loader
- route component берет реальные данные через query hooks
- loading/error на route уровне задаются через `hydrateFallbackElement` и `errorElement`

Именно этот паттерн уже почти нормально сделан в `images`.

### Правило 5. Для list-with-details использовать Container + Detail Query Pattern

Контракт для ветки `groups/:groupId`:
- `group-detail` владеет группой
- `standards-index` и `standard-detail` получают group через outlet context
- `standard-detail` владеет только запросом деталей активного стандарта
- список стандартов всегда берется из group
- expanded detail подгружается отдельно и только для активного standard

Это соответствует текущему UX лучше, чем попытка притвориться полноценной detail page.

### Правило 6. Все query hooks оформляются в одном стиле

Для каждого запроса:
- `getX(...)`
- `getXQueryOptions(...)` через `queryOptions(...)`
- `useGetX(...)`

Правило:
- не использовать `id!` в публичном hook API, если `id` может быть nullable
- если `id` обязателен, пусть hook принимает только `string`
- если `id` может отсутствовать, делайте отдельный безопасный wrapper на уровне вызова, а не через `!`

### Правило 7. Инвалидация должна бить по владельцам данных, а не по всему миру

После мутации задавать вопрос:
"Какие query являются source of truth для экранов, которые должны обновиться?"

Примеры:
- аннотация сегмента: `image(id)` + `standard(id)` норм
- удаление изображения: `standard(id)` норм, но если group summary использует счетчики из group detail, надо еще обновлять owner-query группы
- `groups.all()` инвалидировать только если реально меняется список/сводка списка

### Правило 8. `QueryState` не решает архитектуру

Использовать `QueryState`:
- в route page, когда page реально client-fetched
- в локальном блоке данных внутри экрана
- в небольших panels/sections

Не использовать `QueryState` как объяснение, почему экран не знает, откуда брать данные.

### Правило 9. Интерактивные карточки и строки навигации должны быть ссылками или кнопками

По Web Interface Guidelines сейчас подозрительные места:
- [`client/src/page-components/standards/components/standard-card/standard-card.tsx#L56`](/home/user/photo-standards-db/client/src/page-components/standards/components/standard-card/standard-card.tsx#L56)
- [`client/src/page-components/standards/components/standard-card/standard-card.tsx#L105`](/home/user/photo-standards-db/client/src/page-components/standards/components/standard-card/standard-card.tsx#L105)
- [`client/src/app/routes/groups/groups-layout.tsx#L52`](/home/user/photo-standards-db/client/src/app/routes/groups/groups-layout.tsx#L52)

Сейчас там есть `onClick`-интерактивность на небезопасных контейнерах. Это дает риск по:
- клавиатурной доступности
- ожидаемому поведению ссылок
- cmd/ctrl-click

Если элемент ведет на другой URL, по умолчанию это ссылка.
Если элемент только меняет локальное состояние, по умолчанию это кнопка.

## Как я бы формализовал ваш текущий фронт

### Слой 1. App routing

Отвечает за:
- URL
- route boundaries
- page-level fallback/error
- page-critical prefetch

Файлы:
- [`client/src/app/router.tsx`](/home/user/photo-standards-db/client/src/app/router.tsx)
- [`client/src/app/routes/*`](/home/user/photo-standards-db/client/src/app/routes)

### Слой 2. Feature data

Отвечает за:
- API вызовы
- query keys
- query options
- mutations
- invalidation/optimistic updates

Файлы:
- `client/src/page-components/*/api/*`

### Слой 3. Page composition

Отвечает за:
- layout
- какие блоки показывать
- какие ids активны
- как route-state соединяется с UI

Файлы:
- `group-detail.tsx`
- `standard-detail.tsx`
- `images.tsx`
- `standards-section.tsx`

### Слой 4. Pure UI blocks

Отвечает за:
- визуал
- локальные интеракции
- отсутствие знания о роутинге и query ownership, где это возможно

Файлы:
- `StandardCard`
- `SegmentHeader`
- `SegmentPanel`
- `QueryState`

## Как строить дальше именно в вашей ситуации

С учетом вашей фразы, что разделы данных почти готовы и возможно еще будут использоваться списками в инспекции, лучший путь не делать все “как в учебнике”, а зафиксировать 2 разных режима:

### Режим A. Коллекции и инспекция

Использовать для:
- groups
- standards list
- раскрываемые стандартные карточки

Паттерн:
- parent route владеет коллекцией/контекстом
- child route синхронизирует активный item через URL
- detail query грузится только для выбранного item

То есть для `groups/:groupId/standards/:standardId` текущая идея в целом жизнеспособна.

### Режим B. Рабочий экран / editor / task view

Использовать для:
- image annotation
- training detail, если он ведет себя как полноценный рабочий экран
- camera detail, если там будет тяжелая форма или rich data

Паттерн:
- полноценный data route
- loader с prefetch
- route fallback/error boundaries
- page owns transient UI state

## Приоритеты на распутывание

### P0. Зафиксировать контракты, не переписывая весь фронт

1. Официально выбрать, что `standard-detail` это:
- либо route-driven expandable list item
- либо отдельная detail page

Сейчас по коду это первый вариант. Я бы его и закрепил.

2. Зафиксировать правило:
- `groups/:groupId` ветка работает как collection + active item
- `images/:imageId` ветка работает как full data route

### P1. Привести query hooks к одному стандарту

Сделать единообразно:
- `queryOptions(...)`
- одинаковый нейминг
- убрать неиспользуемые default объекты, если они не часть UI-контракта
- убрать `id!` из публичных хуков

### P2. Привести интерактивные контейнеры к семантике

Минимум проверить:
- `StandardCard` header
- image cards
- sidebar items

### P3. Уточнить invalidation map

Составить таблицу:
- mutation
- owner queries
- derived queries
- можно ли обновить cache точечно

Без этого через несколько экранов вы снова получите “магические refetch по всему приложению”.

## Практическое решение для проекта прямо сейчас

Если не делать лишнего hero-refactor, я бы выбрал такой курс:

1. Оставить `groups -> standards` как route-driven list/detail hybrid.
2. Оставить `images` как основной эталонный data-heavy route.
3. Не пытаться срочно перевести всю ветку `groups` на loader-prefetch.
4. Вместо этого ввести единый written contract на use-cases:
- collection route
- active-item route
- editor route

Это даст порядок без бессмысленного переписывания.

## Итог

Ваш фронт не “мертвый”. Он в переходной фазе между:
- простым client-fetched CRUD
- и нормальным route-aware data app

Самое удачное, что уже есть:
- `images` как data route
- feature-local API hooks
- общий query infrastructure

Самое опасное:
- отсутствие одного правила владения данными страницы
- смесь route page и expandable-list semantics
- слишком свободная инвалидация cache

Если нужен следующий шаг, логичнее не рефакторить все вслепую, а сначала закрепить contract matrix:
- что считается list route
- что считается detail route
- что считается editor route
- где loader обязателен
- где owner data это parent route
- где query invalidation обязана быть точной
