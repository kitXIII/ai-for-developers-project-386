import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "Calendar Booking API" })
@route("api/v1")
namespace BookingApi;

/** Общая форма ошибки: машиночитаемый код и человекочитаемое сообщение. */
model ApiError {
  /** Машиночитаемый код, например `slot_taken`, `outside_window`. */
  code: string;

  /** Человекочитаемое описание ошибки. */
  message: string;
}

/** 400 — ошибка валидации запроса. */
@error
model ValidationError {
  @statusCode statusCode: 400;
  ...ApiError;
}

/** 404 — ресурс не найден. */
@error
model NotFoundError {
  @statusCode statusCode: 404;
  ...ApiError;
}

/** 409 — конфликт: слот занят или время вне окна записи/графика работы. */
@error
model ConflictError {
  @statusCode statusCode: 409;
  ...ApiError;
}

/** Тип встречи — представление владельца календаря. */
model AdminMeetingType {
  /** Идентификатор типа встречи (UUID). */
  id: string;

  /** Название: 1–100 символов. */
  name: string;

  /** Описание: 0–1000 символов. */
  description: string;

  /** Длительность в целых минутах: 5–540. */
  durationMinutes: int32;
}

/** Тип встречи — представление гостя. */
model GuestMeetingType {
  /** Идентификатор типа встречи (UUID). */
  id: string;

  /** Название: 1–100 символов. */
  name: string;

  /** Описание: 0–1000 символов. */
  description: string;

  /** Длительность в целых минутах: 5–540. */
  durationMinutes: int32;
}

/** Запрос на создание типа встречи. */
model CreateMeetingTypeRequest {
  /** Название: 1–100 символов. */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Описание: 0–1000 символов. */
  @maxLength(1000)
  description: string;

  /** Длительность в целых минутах: 5–540. */
  @minValue(5)
  @maxValue(540)
  durationMinutes: int32;
}

/** Тип встречи в ответе на создание (код 201). */
model AdminMeetingTypeCreated {
  @statusCode statusCode: 201;
  ...AdminMeetingType;
}

/** Доступный слот — свободный интервал, который можно забронировать. */
model Slot {
  /** Начало слота, момент с offset +03:00. */
  start: offsetDateTime;

  /** Конец слота: start + длительность типа встречи. */
  end: offsetDateTime;
}

/** Сутки окна записи с доступными слотами. */
model SlotsDay {
  /** Дата в часовом поясе UTC+3, формат YYYY-MM-DD. */
  date: plainDate;

  /** Слоты дня по возрастанию времени начала. */
  slots: Slot[];
}

/** Бронирование — запись гостя на слот по выбранному типу встречи. */
model Booking {
  /** Идентификатор бронирования (UUID). */
  id: string;

  /** Идентификатор забронированного типа встречи (UUID). */
  meetingTypeId: string;

  /** Название типа встречи на момент бронирования (типы не редактируются). */
  meetingTypeName: string;

  /** Имя гостя: 1–100 символов. */
  guestName: string;

  /** Начало встречи, момент с offset +03:00. */
  start: offsetDateTime;

  /** Конец встречи: start + длительность типа встречи. */
  end: offsetDateTime;
}

/** Бронирование в ответе на создание (код 201). */
model BookingCreated {
  @statusCode statusCode: 201;
  ...Booking;
}

/** Запрос на создание бронирования. */
model CreateBookingRequest {
  /** Идентификатор типа встречи (UUID). */
  meetingTypeId: string;

  /** Желаемое начало встречи по сетке слотов, момент с offset +03:00. */
  start: offsetDateTime;

  /** Имя гостя: 1–100 символов. */
  @minLength(1)
  @maxLength(100)
  guestName: string;
}

// --- Гостевая часть ---

@tag("Guest")
@route("meeting-types")
op listMeetingTypes(): GuestMeetingType[];

@tag("Guest")
@route("meeting-types/{id}")
@get op getMeetingType(@path id: string): GuestMeetingType | NotFoundError;

@tag("Guest")
@route("meeting-types/{id}/slots")
@get op listAvailableSlots(@path id: string): SlotsDay[] | NotFoundError;

@tag("Guest")
@route("bookings")
@post op createBooking(...CreateBookingRequest): BookingCreated | ValidationError | NotFoundError | ConflictError;

// --- Административная часть ---

@tag("Admin")
@route("admin/meeting-types")
@post op createMeetingType(...CreateMeetingTypeRequest): AdminMeetingTypeCreated | ValidationError;

@tag("Admin")
@route("admin/meeting-types")
op listAdminMeetingTypes(): AdminMeetingType[];

@tag("Admin")
@route("admin/meeting-types/{id}")
@get op getAdminMeetingType(@path id: string): AdminMeetingType | NotFoundError;

@tag("Admin")
@route("admin/bookings")
op listBookings(): Booking[];
