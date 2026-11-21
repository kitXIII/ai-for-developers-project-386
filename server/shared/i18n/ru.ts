import type { Messages } from '@app/api/types';

// The Russian catalog: the only place where user-facing wording lives (ADR 0007).
// Structure follows the service sections, not the components; `satisfies` keeps
// the object total against the contract model, so a missing key fails tsc.
// Placeholders are written as `{name}` and filled by `t()`.
export const ru = {
  common: {
    appName: 'Календарь звонков',
    nav: {
      home: 'На главную',
      admin: 'Администрирование',
    },
    actions: {
      create: 'Создать',
      cancel: 'Отмена',
      back: 'Назад',
      next: 'Продолжить',
      confirm: 'Подтвердить',
      retry: 'Повторить',
    },
    duration: '{minutes} мин',
    aria: {
      toggleMenu: 'Переключить меню',
    },
  },
  home: {
    description:
      'Сервис бронирования звонков. Владелец календаря задаёт типы встреч — с названием, ' +
      'описанием и длительностью, — а гости выбирают подходящий тип и записываются на свободный ' +
      'слот в календаре.',
    bookAction: 'Записаться',
  },
  booking: {
    list: {
      title: 'Выбор типа встречи',
      loading: 'Загрузка типов встреч',
      loadFailed: 'Не удалось загрузить типы встреч.',
      empty: 'Типов встреч пока нет — загляните позже.',
    },
    wizard: {
      stepCounter: 'Шаг {step} из {total}',
      steps: {
        type: 'Тип',
        dateTime: 'Дата и время',
        confirm: 'Имя и подтверждение',
      },
      backToList: 'К выбору типа',
      loading: 'Загрузка типа встречи',
      loadFailed: 'Не удалось загрузить тип встречи.',
      notFound: 'Тип встречи не найден.',
    },
    dateTime: {
      loading: 'Загрузка слотов',
      loadFailed: 'Не удалось загрузить слоты. Попробуйте ещё раз.',
      freeTime: 'Свободное время {date}:',
      nextMonth: 'Следующий месяц',
      previousMonth: 'Предыдущий месяц',
    },
    confirm: {
      noSlotSelected: 'Сначала выберите дату и время.',
      nameLabel: 'Имя',
      namePlaceholder: 'Как к вам обращаться',
      nameInvalid: 'Имя обязательно: от {min} до {max} символов, без пробелов по краям',
      summary: '{meetingTypeName}, {day}, {time} (UTC+3)',
      submit: 'Подтвердить',
      otherTime: 'Выбрать другое время',
      createFailed: 'Не удалось создать бронирование. Попробуйте ещё раз.',
    },
    success: {
      title: 'Бронирование подтверждено',
      meetingType: 'Тип встречи: {name}',
      day: 'День: {day}',
      time: 'Время: {time} (UTC+3)',
      guest: 'Гость: {name}',
    },
  },
  admin: {
    title: 'Администрирование',
    tabs: {
      meetingTypes: 'Типы встреч',
      bookings: 'Бронирования',
    },
    meetingTypes: {
      create: 'Создать тип',
      loading: 'Загрузка типов встреч',
      loadFailed: 'Не удалось загрузить типы встреч.',
      empty: 'Типов встреч пока нет. Создайте первый — и гости смогут на него записаться.',
      duration: 'Длительность: {minutes} мин',
    },
    meetingTypeDetail: {
      back: 'К списку типов',
      loading: 'Загрузка типа встречи',
      loadFailed: 'Не удалось загрузить тип встречи.',
      notFound: 'Тип встречи не найден.',
      duration: 'Длительность: {minutes} мин',
    },
    createModal: {
      title: 'Создать тип встречи',
      nameLabel: 'Название',
      namePlaceholder: 'Например, Созвон по проекту',
      descriptionLabel: 'Описание',
      descriptionPlaceholder: 'О чём поговорим',
      durationLabel: 'Длительность (минуты)',
      cancel: 'Отмена',
      submit: 'Создать',
      failed: 'Не удалось создать тип встречи. Попробуйте ещё раз.',
      nameInvalid: 'Название обязательно: от {min} до {max} символов, без пробелов по краям',
      descriptionInvalid: 'Описание обязательно: до {max} символов',
      durationInvalid: 'Длительность — целое число минут от {min} до {max}',
    },
    bookings: {
      loading: 'Загрузка бронирований',
      loadFailed: 'Не удалось загрузить бронирования.',
      empty: 'Бронирований пока нет — как только гость запишется, бронь появится здесь.',
      columns: {
        when: 'Когда (UTC+3)',
        type: 'Тип',
        guest: 'Гость',
      },
    },
  },
  errors: {
    api: {
      validation_failed: 'Проверьте правильность заполнения формы.',
      meeting_type_not_found: 'Тип встречи не найден.',
      slot_taken: 'Это время уже занято. Выберите другой слот.',
      outside_window: 'Это время вне окна записи: бронировать можно на 14 дней вперёд.',
      outside_schedule: 'Это время вне графика работы: брони доступны в будни с 09:00 до 18:00.',
    },
    unexpected: 'Что-то пошло не так. Попробуйте ещё раз.',
    domain: {
      meetingType: {
        name: 'Название обязательно: от {min} до {max} символов, без пробелов по краям.',
        description: 'Описание обязательно: до {max} символов.',
        duration: 'Длительность — целое число минут от {min} до {max}.',
        notFound: 'Тип встречи не найден.',
      },
      booking: {
        guestName: 'Имя обязательно: от {min} до {max} символов, без пробелов по краям.',
      },
      slots: {
        outsideWindow:
          'Слот вне окна записи: бронировать можно на 14 дней вперёд, начиная с завтрашнего дня.',
        weekend: 'Слот вне графика работы: брони доступны только в будние дни.',
        grid: 'Слот вне сетки расписания: время начала кратно длительности типа от 09:00 (UTC+3).',
        workdayEnd: 'Слот вне графика работы: рабочий день заканчивается в 18:00 (UTC+3).',
        taken: 'Это время уже занято. Выберите другой слот.',
      },
    },
    http: {
      bodyNotObject: 'Тело запроса должно быть JSON-объектом.',
      meetingTypeIdRequired: 'Укажите тип встречи.',
      startFormat: 'Время начала — ISO-момент со смещением, например 2026-12-01T10:00:00+03:00.',
    },
  },
  notFound: {
    title: '404',
    text: 'Такой страницы нет. Возможно, она была перемещена или удалена.',
  },
} satisfies Messages;
