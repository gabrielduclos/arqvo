/**
 * Currency editing at the boundary: UI uses reais, API uses integer centavos.
 * We never round an arbitrary JS float or silently discard extra decimals.
 */
export function formatAmountInput(cents: number | string | null | undefined): string {
  if (cents === null || cents === undefined || cents === '') return '';
  const amount = Number(cents);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100000000000) return '';
  const reais = Math.floor(amount / 100);
  const fraction = String(amount % 100).padStart(2, '0');
  return reais.toLocaleString('pt-BR') + ',' + fraction;
}

export function parseAmountInput(raw: string): number | null | undefined {
  const input = raw.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!input) return null; // Clear an incorrect amount explicitly.
  let reais: string, cents: string;
  if (/^\d{1,12}(?:,\d{1,2})?$/.test(input)) {
    [reais, cents = ''] = input.split(',');
  } else if (/^\d{1,12}(?:\.\d{1,2})?$/.test(input)) {
    [reais, cents = ''] = input.split('.');
  } else if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(input)) {
    const clean = input.replace(/\./g, '');
    [reais, cents = ''] = clean.split(',');
  } else {
    return undefined; // Invalid, do not overwrite stored value.
  }
  const value = Number(reais) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(value) || value > 100000000000) return undefined;
  return value;
}
