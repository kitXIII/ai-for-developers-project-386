// Каталог пользовательских текстов: единственный источник строк интерфейса и
// ошибок (ADR 0007). Дерево повторяет структуру сервиса, а не компонентов:
// `common` — общие подписи, дальше по разделам, `errors` — тексты ошибок.
// Подстановки записываются фигурными скобками: `{min}`, `{name}`.
//
// `errors.api` — словарь для клиента: код контракта → фраза. Остальные ветки
// `errors` живут на сервере: домен носит ключ, HTTP-адаптер собирает строку.

/** Каталог текстов целиком. */
model Messages {
  /** Общие подписи, общие для всех разделов. */
  common: MessagesCommon;

  /** Главная страница. */
  home: MessagesHome;

  /** Гостевой сценарий: выбор типа, мастер записи, экран успеха. */
  booking: MessagesBooking;

  /** Раздел владельца календаря. */
  admin: MessagesAdmin;

  /** Тексты ошибок. */
  errors: MessagesErrors;

  /** Страница «не найдено». */
  notFound: MessagesNotFound;
}

/** Общие подписи. */
model MessagesCommon {
  /** Название сервиса. */
  appName: string;

  /** Навигация. */
  nav: MessagesCommonNav;

  /** Общие действия. */
  actions: MessagesCommonActions;

  /** Длительность в сокращённой форме: «{minutes} мин». */
  duration: string;

  /** Подписи доступности. */
  aria: MessagesCommonAria;
}

/** Навигация. */
model MessagesCommonNav {
  /** Ссылка на главную. */
  home: string;

  /** Ссылка в раздел администрирования. */
  admin: string;
}

/** Общие действия. */
model MessagesCommonActions {
  /** Создать. */
  create: string;

  /** Отмена. */
  cancel: string;

  /** Назад. */
  back: string;

  /** Продолжить. */
  next: string;

  /** Подтвердить. */
  confirm: string;

  /** Повторить неудавшуюся загрузку. */
  retry: string;
}

/** Подписи доступности. */
model MessagesCommonAria {
  /** Кнопка меню на мобильном экране. */
  toggleMenu: string;
}

/** Главная страница. */
model MessagesHome {
  /** Описание сервиса. */
  description: string;

  /** Кнопка перехода к записи. */
  bookAction: string;
}

/** Страница «не найдено». */
model MessagesNotFound {
  /** Заголовок страницы: код ответа. */
  title: string;

  /** Пояснение, почему страницы нет. */
  text: string;
}

/** Гостевой сценарий. */
model MessagesBooking {
  /** Список типов встреч. */
  list: MessagesBookingList;

  /** Мастер записи. */
  wizard: MessagesBookingWizard;

  /** Шаг «Дата и время». */
  dateTime: MessagesBookingDateTime;

  /** Шаг «Имя и подтверждение». */
  confirm: MessagesBookingConfirm;

  /** Экран подтверждённого бронирования. */
  success: MessagesBookingSuccess;
}

/** Список типов встреч. */
model MessagesBookingList {
  /** Заголовок страницы. */
  title: string;

  /** Подпись загрузки. */
  loading: string;

  /** Не удалось загрузить список. */
  loadFailed: string;

  /** Пустой список. */
  empty: string;
}

/** Мастер записи. */
model MessagesBookingWizard {
  /** Индикатор шага: «Шаг {step} из {total}». */
  stepCounter: string;

  /** Названия шагов. */
  steps: MessagesBookingWizardSteps;

  /** Ссылка назад к списку типов. */
  backToList: string;

  /** Подпись загрузки типа встречи. */
  loading: string;

  /** Не удалось загрузить тип встречи. */
  loadFailed: string;

  /** Тип встречи не найден. */
  notFound: string;
}

/** Названия шагов мастера. */
model MessagesBookingWizardSteps {
  /** Шаг 1 — выбор типа. */
  type: string;

  /** Шаг 2 — дата и время. */
  dateTime: string;

  /** Шаг 3 — имя и подтверждение. */
  confirm: string;
}

/** Шаг «Дата и время». */
model MessagesBookingDateTime {
  /** Подпись загрузки слотов. */
  loading: string;

  /** Не удалось загрузить слоты. */
  loadFailed: string;

  /** Заголовок свободного времени: «Свободное время {date}:». */
  freeTime: string;

  /** Кнопка следующего месяца в календаре. */
  nextMonth: string;

  /** Кнопка предыдущего месяца в календаре. */
  previousMonth: string;
}

/** Шаг «Имя и подтверждение». */
model MessagesBookingConfirm {
  /** Имя не заполнено. */
  noSlotSelected: string;

  /** Подпись поля «Имя». */
  nameLabel: string;

  /** Плейсхолдер поля «Имя». */
  namePlaceholder: string;

  /** Имя не прошло проверку: «от {min} до {max} символов». */
  nameInvalid: string;

  /** Сводка выбранного слота: «{meetingTypeName}, {day}, {time} (UTC+3)». */
  summary: string;

  /** Кнопка подтверждения. */
  submit: string;

  /** Кнопка возврата к выбору времени. */
  otherTime: string;

  /** Бронирование не создано по технической причине. */
  createFailed: string;
}

/** Экран подтверждённого бронирования. */
model MessagesBookingSuccess {
  /** Заголовок. */
  title: string;

  /** Строка «Тип встречи: {name}». */
  meetingType: string;

  /** Строка «День: {day}». */
  day: string;

  /** Строка «Время: {time} (UTC+3)». */
  time: string;

  /** Строка «Гость: {name}». */
  guest: string;
}

/** Раздел владельца календаря. */
model MessagesAdmin {
  /** Заголовок раздела. */
  title: string;

  /** Названия вкладок. */
  tabs: MessagesAdminTabs;

  /** Вкладка типов встреч. */
  meetingTypes: MessagesAdminMeetingTypes;

  /** Страница детализации типа встречи. */
  meetingTypeDetail: MessagesAdminMeetingTypeDetail;

  /** Модальное окно создания типа встречи. */
  createModal: MessagesAdminCreateModal;

  /** Вкладка бронирований. */
  bookings: MessagesAdminBookings;
}

/** Названия вкладок раздела. */
model MessagesAdminTabs {
  /** Вкладка «Типы встреч». */
  meetingTypes: string;

  /** Вкладка «Бронирования». */
  bookings: string;
}

/** Вкладка типов встреч. */
model MessagesAdminMeetingTypes {
  /** Кнопка создания типа встречи. */
  create: string;

  /** Подпись загрузки. */
  loading: string;

  /** Не удалось загрузить список. */
  loadFailed: string;

  /** Пустой список. */
  empty: string;

  /** Строка «Длительность: {minutes} мин». */
  duration: string;
}

/** Страница детализации типа встречи. */
model MessagesAdminMeetingTypeDetail {
  /** Ссылка к списку типов. */
  back: string;

  /** Подпись загрузки. */
  loading: string;

  /** Не удалось загрузить тип встречи. */
  loadFailed: string;

  /** Тип встречи не найден. */
  notFound: string;

  /** Строка «Длительность: {minutes} мин». */
  duration: string;
}

/** Модальное окно создания типа встречи. */
model MessagesAdminCreateModal {
  /** Заголовок окна. */
  title: string;

  /** Подпись поля «Название». */
  nameLabel: string;

  /** Плейсхолдер поля «Название». */
  namePlaceholder: string;

  /** Подпись поля «Описание». */
  descriptionLabel: string;

  /** Плейсхолдер поля «Описание». */
  descriptionPlaceholder: string;

  /** Подпись поля «Длительность». */
  durationLabel: string;

  /** Кнопка отмены. */
  cancel: string;

  /** Кнопка создания. */
  submit: string;

  /** Тип встречи не создан по технической причине. */
  failed: string;

  /** Название не прошло проверку: «от {min} до {max} символов». */
  nameInvalid: string;

  /** Описание не прошло проверку: «до {max} символов». */
  descriptionInvalid: string;

  /** Длительность не прошла проверку: «от {min} до {max}». */
  durationInvalid: string;
}

/** Вкладка бронирований. */
model MessagesAdminBookings {
  /** Подпись загрузки. */
  loading: string;

  /** Не удалось загрузить бронирования. */
  loadFailed: string;

  /** Пустой список. */
  empty: string;

  /** Заголовки колонок таблицы. */
  columns: MessagesAdminBookingColumns;
}

/** Заголовки колонок таблицы бронирований. */
model MessagesAdminBookingColumns {
  /** Колонка времени в рамке UTC+3. */
  when: string;

  /** Колонка типа встречи. */
  type: string;

  /** Колонка имени гостя. */
  guest: string;
}

/** Тексты ошибок. */
model MessagesErrors {
  /** Фразы для кодов контракта: клиент показывает ошибку по `code`. */
  api: MessagesErrorsApi;

  /** Непредвиденная ошибка на клиенте. */
  unexpected: string;

  /** Тексты доменных ошибок: домен носит ключ, адаптер собирает строку. */
  domain: MessagesErrorsDomain;

  /** Ошибки HTTP-конверта. */
  http: MessagesErrorsHttp;
}

/** Фразы для кодов контракта; по полю на каждый код из `ErrorCode`. */
model MessagesErrorsApi {
  /** Код `validation_failed`. */
  validation_failed: string;

  /** Код `meeting_type_not_found`. */
  meeting_type_not_found: string;

  /** Код `slot_taken`. */
  slot_taken: string;

  /** Код `outside_window`. */
  outside_window: string;

  /** Код `outside_schedule`. */
  outside_schedule: string;
}

/** Тексты доменных ошибок. */
model MessagesErrorsDomain {
  /** Ошибки типа встречи. */
  meetingType: MessagesErrorsDomainMeetingType;

  /** Ошибки бронирования. */
  booking: MessagesErrorsDomainBooking;

  /** Ошибки правил слотов. */
  slots: MessagesErrorsDomainSlots;
}

/** Ошибки типа встречи. */
model MessagesErrorsDomainMeetingType {
  /** Название не прошло проверку: «от {min} до {max} символов». */
  name: string;

  /** Описание не прошло проверку: «до {max} символов». */
  description: string;

  /** Длительность не прошла проверку: «от {min} до {max} минут». */
  duration: string;

  /** Тип встречи не найден. */
  notFound: string;
}

/** Ошибки бронирования. */
model MessagesErrorsDomainBooking {
  /** Имя гостя не прошло проверку: «от {min} до {max} символов». */
  guestName: string;
}

/** Ошибки правил слотов. */
model MessagesErrorsDomainSlots {
  /** Слот вне окна записи. */
  outsideWindow: string;

  /** Слот в выходной день. */
  weekend: string;

  /** Слот не по сетке стартов. */
  grid: string;

  /** Слот выходит за конец рабочего дня. */
  workdayEnd: string;

  /** Слот уже занят. */
  taken: string;
}

/** Ошибки HTTP-конверта. */
model MessagesErrorsHttp {
  /** Тело запроса не JSON-объект. */
  bodyNotObject: string;

  /** В запросе нет типа встречи. */
  meetingTypeIdRequired: string;

  /** Время начала не в формате ISO-момента со смещением. */
  startFormat: string;
}

/** Ответ ручки каталога. */
model MessagesPayload {
  /** Язык каталога; пока всегда `ru`. */
  locale: string;

  /** Тексты интерфейса и ошибок. */
  messages: Messages;
}
