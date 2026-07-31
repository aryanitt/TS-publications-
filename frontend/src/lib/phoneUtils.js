/**
 * Shared utility functions for formatting phone numbers for dialers (tel: links)
 */

/**
 * Formats a phone number for dialing (e.g. for tel: links).
 * Ensures +91 is added for 10-digit Indian numbers, and + is added for 12-digit numbers starting with 91.
 *
 * Examples:
 * - "8208813895" -> "+918208813895"
 * - "918208813895" -> "+918208813895"
 * - "+918208813895" -> "+918208813895"
 * - "08208813895" -> "+918208813895"
 */
export function formatDialerPhone(phone) {
  if (!phone) return "";
  const raw = String(phone).trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // 10-digit Indian number: prefix +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // 11-digit number starting with 0 (e.g. 08208813895): replace 0 with +91
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }

  // 12-digit number starting with 91 (e.g. 918208813895): prefix +
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  // If raw string already starts with +, keep + and append clean digits
  if (raw.startsWith("+")) {
    return `+${digits}`;
  }

  // International/other lengths: add + if digits > 10
  if (digits.length > 10) {
    return `+${digits}`;
  }

  return `+91${digits}`;
}

/**
 * Returns a tel: URL formatted with country code for phone dialers.
 */
export function formatTelUrl(phone) {
  const formatted = formatDialerPhone(phone);
  return formatted ? `tel:${formatted}` : "";
}
