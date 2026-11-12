import { formatErrorMessage, type ErrorCode, type ErrorValues } from "./errorCodes";

/**
 * A request that is well-formed but cannot be carried out — a taken email, a
 * completed attempt, a provider that refused.
 *
 * Carries a {@link ErrorCode} rather than a sentence so the route layer can say
 * it in the caller's language; `message` stays English, for logs.
 */
export class InvalidOperationError extends Error {
  readonly code: ErrorCode;
  readonly values?: ErrorValues;

  constructor(code: ErrorCode, values?: ErrorValues) {
    super(formatErrorMessage(code, values));
    this.name = "InvalidOperationError";
    this.code = code;
    this.values = values;
  }
}
