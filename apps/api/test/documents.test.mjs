import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validFilename, validObjectKey, ALLOWED_MIME, MAX_FILE_BYTES, validateEditableAmount } from '../src/documents.mjs';

test('object keys are always bound to their authenticated user', () => {
  const id = 'userA';
  const uuid = '550e8400-e29b-41d4-a716-446655440000';
  assert.equal(validObjectKey(id, id + '/' + uuid), true);
  assert.equal(validObjectKey(id, 'userB/' + uuid), false);
  assert.equal(validObjectKey(id, 'userA/../../' + uuid), false);
  assert.equal(validObjectKey('a/b', 'a%2Fb/' + uuid), true);
});
test('names and MIME are strictly validated', () => {
  assert.equal(validFilename('Nota fiscal.pdf'), true);
  assert.equal(validFilename('../private.pdf'), false);
  assert.equal(validFilename('malware\\x.exe'), false);
  assert.equal(validFilename(''), false);
  assert.equal(ALLOWED_MIME.has('text/html'), false);
  assert.equal(MAX_FILE_BYTES, 20 * 1024 * 1024);
});

test('manual amount validation accepts integer centavos, zero, clearing and omitted legacy field', () => {
  assert.deepEqual(validateEditableAmount({}), { present: false, valid: true, cents: null });
  assert.deepEqual(validateEditableAmount({ amountCents: 16480 }), { present: true, valid: true, cents: 16480 });
  assert.deepEqual(validateEditableAmount({ amountCents: 0 }), { present: true, valid: true, cents: 0 });
  assert.deepEqual(validateEditableAmount({ amountCents: null }), { present: true, valid: true, cents: null });
  for (const amountCents of [-1, 12.34, '16480', NaN, Infinity, 100000000001]) {
    assert.equal(validateEditableAmount({ amountCents }).valid, false);
  }
});
