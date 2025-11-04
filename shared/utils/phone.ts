export function normalizePhoneE164(input: string, countryCode?: string): string {
  try {
    if (!input) return input as any;
    let p = String(input).trim();
    // Remove whatsapp: prefix
    p = p.replace(/^whatsapp:/, '');
    // Remove spaces, dashes, parentheses
    p = p.replace(/[\s\-()]/g, '');
    // Already in E.164
    if (p.startsWith('+')) {
      // Keep only leading + and digits
      return '+' + p.replace(/[^\d]/g, '').replace(/^\+/, '');
    }
    // Convert 00 prefix to +
    if (p.startsWith('00')) {
      return '+' + p.slice(2).replace(/\D/g, '');
    }
    const digits = p.replace(/\D/g, '');
    if (!digits) return p;
    // Default to US/Canada (+1) when no countryCode provided
    const cc = (countryCode ?? '1').replace(/\D/g, '');
    return `+${cc}${digits}`;
  } catch {
    return input as any;
  }
}
