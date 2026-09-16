import { randomBytes } from 'crypto';

/**
 * base64url's alphabet: base64 with the two characters that need escaping in a
 * URL (`+` and `/`) swapped for `-` and `_`.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export const SURVEY_PUBLIC_ID_LENGTH = 6;

/**
 * The public identifier a survey is known by outside the database: six
 * base64url characters, so it can sit in a URL unescaped.
 *
 * Six characters is 36 bits, which is plenty to keep guessing impractical at
 * this scale but not enough to assume uniqueness — the unique index on
 * `surveys.public_id` is the guarantee, and `createSurvey` retries when it
 * loses.
 *
 * 256 is a multiple of the alphabet's length, so masking a random byte down to
 * six bits picks each character with equal probability.
 */
export function generateSurveyPublicId(): string {
    const bytes = randomBytes(SURVEY_PUBLIC_ID_LENGTH);
    let publicId = '';

    for (const byte of bytes) {
        publicId += ALPHABET[byte & 0b111111];
    }

    return publicId;
}
