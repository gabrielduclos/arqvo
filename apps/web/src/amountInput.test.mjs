import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAmountInput, parseAmountInput } from './amountInput.ts';

test('money input parses Brazilian decimal and grouping without floating-point errors', () => {
  assert.equal(parseAmountInput('164,80'), 16480);
  assert.equal(parseAmountInput('R$ 1.234,56'), 123456);
  assert.equal(parseAmountInput('0,01'), 1);
  assert.equal(parseAmountInput('0,00'), 0);
  assert.equal(parseAmountInput('15'), 1500);
  assert.equal(parseAmountInput('12,5'), 1250);
  assert.equal(parseAmountInput('12.50'), 1250);
  assert.equal(parseAmountInput('1.234'), 123400);
});

test('unfilled money input clears explicitly; invalid amounts are rejected', () => {
  assert.equal(parseAmountInput(''), null);
  assert.equal(parseAmountInput('R$'), null);
  assert.equal(parseAmountInput('-12,00'), undefined);
  assert.equal(parseAmountInput('12,999'), undefined);
  assert.equal(parseAmountInput('um real'), undefined);
  assert.equal(parseAmountInput('1,000.00'), undefined);
  assert.equal(parseAmountInput('1000000001,00'), undefined);
});

test('money display is pt-BR and supports zero and missing values', () => {
  assert.equal(formatAmountInput('16480'), '164,80');
  assert.equal(formatAmountInput(123456), '1.234,56');
  assert.equal(formatAmountInput(0), '0,00');
  assert.equal(formatAmountInput(null), '');
  assert.equal(formatAmountInput('not-an-amount'), '');
});
