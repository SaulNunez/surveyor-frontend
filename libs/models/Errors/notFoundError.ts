import { formatErrorMessage, type ErrorCode, type ErrorValues } from "./errorCodes";

/**
 * A row that is absent — or that belongs to someone else, which the ownership
 * checks deliberately report the same way so the API does not leak what exists.
 *
 * Carries a {@link ErrorCode} rather than a sentence so the route layer can say
 * it in the caller's language; `message` stays English, for logs.
 */
export class NotFoundError extends Error {
  readonly code: ErrorCode;
  readonly values?: ErrorValues;

  constructor(code: ErrorCode, values?: ErrorValues) {
    super(formatErrorMessage(code, values));
    this.name = "NotFoundError";
    this.code = code;
    this.values = values;
  }
}
