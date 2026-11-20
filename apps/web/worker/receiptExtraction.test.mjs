import assert from 'node:assert/strict';
import test from 'node:test';
import { merchantCandidate, categoryCandidate, receiptItemLines } from './receiptExtraction.ts';

const sample = [
  'PET ada',
  'FR',
  'CNPJ: 28.720.764/0005-02 5 PARADA PEDRO PELANDA',
  'LTDA',
  'RODOVIA SP-270 KM 420 AREA RURAL DE PALMITAL',
  'DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA',
  '# Cod Descrição Qtd Un VlUnit. VlTotal',
  'COL 000034555 CAFE EXPESSO DUPLO 80ML',
  '1 UN X 10,99 10,99',
  'QTD. TOTAL DE ITENS 001',
  'VALOR TOTAL R$ 10,99',
  'FORMA DE PAGAMENTO Valor Pago',
  'Cartão de Crédito MasterCard 10,99',
  'MySOFT Sistemas Ltda.'
].join('\n');

test('NFC-e OCR identifies establishment after CNPJ, joining LTDA continuation', () => {
  const merchant = merchantCandidate(sample);
  assert.equal(merchant?.value, 'PARADA PEDRO PELANDA LTDA');
  assert.equal(merchant?.source, 'cnpj');
  assert.ok(merchant.confidence >= 80);
});

test('coffee bought at a gas station is food, never fuel', () => {
  const category = categoryCandidate(sample);
  assert.equal(category?.category, 'alimentacao');
  assert.equal(category?.subcategory, 'Café');
  assert.match(category?.evidence ?? '', /CAFE EXPESSO DUPLO/);
});

test('merchant printed immediately above the CNPJ', () => {
  const merchant = merchantCandidate('PARADA PEDRO PELANDA LTDA\nCNPJ: 28.720.764/0005-02\nDANFE NFC-E');
  assert.equal(merchant?.value, 'PARADA PEDRO PELANDA LTDA');
});

test('issuer label can precede a legal name', () => {
  const merchant = merchantCandidate('RAZÃO SOCIAL: ABC MERCADO DE BAIRRO LTDA\nCNPJ: 12.345.678/0001-90');
  assert.equal(merchant?.value, 'ABC MERCADO DE BAIRRO LTDA');
});

test('a lonely LTDA after CNPJ is not misidentified as the store', () => {
  const merchant = merchantCandidate('CNPJ: 12.345.678/0001-90\nLTDA\nDOCUMENTO AUXILIAR\nMySOFT Sistemas Ltda.');
  assert.ok(!merchant || merchant.value !== 'LTDA');
});

test('a fuel line item is classified as fuel', () => {
  const category = categoryCandidate([
    'POSTO EXEMPLO LTDA',
    'CNPJ: 12.345.678/0001-90',
    'Descrição Qtd Valor',
    'GASOLINA COMUM 20 LT 115,80',
    'TOTAL R$ 115,80'
  ].join('\n'));
  assert.equal(category?.category, 'combustivel');
});

test('store name alone must not imply a category', () => {
  assert.equal(categoryCandidate('POSTO DE COMBUSTÍVEL A LTDA\nCNPJ: 12.345.678/0001-90\nVALOR TOTAL R$ 10,00'), null);
});

test('the printed item header preserves product rows for OCR processing', () => {
  const scope = receiptItemLines(sample);
  assert.equal(scope.explicit, true);
  assert.ok(scope.lines.some(line => line.includes('CAFE EXPESSO')));
  assert.ok(!scope.lines.some(line => /MySOFT/i.test(line)));
});
