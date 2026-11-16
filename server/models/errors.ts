// PROTOTYPE (тикет #19): доменная ошибка без HTTP. Вид ошибки — словарь домена;
// статус и контрактный код появляются только в адаптере (server/routes).
export type DomainErrorKind =
  | 'not_found'
  | 'invalid_value'
  | 'outside_window'
  | 'outside_schedule'
  | 'slot_taken';

export class DomainError extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    message: string,
  ) {
    super(message);
  }
}
