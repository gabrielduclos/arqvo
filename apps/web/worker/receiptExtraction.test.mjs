import assert from 'node:assert/strict';
import test from 'node:test';
import { merchantCandidate, categoryCandidate, receiptItemLines, isPlainMerchantName, modelMerchantName, categoryEvidenceMatches, cleanMerchantLabel } from './receiptExtraction.ts';

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


test('AI commentary cannot be saved as the merchant name', () => {
  const ocr = [
    'Sabor do Presidente Restaurante Ltda',
    'CNPJ: 12.345.678/0001-90',
    'HAMBURGUER 45,00',
    'TOTAL R$ 45,00'
  ].join('\n');
  assert.equal(isPlainMerchantName('O cabeçalho identifica o restaurante como "Sabor do Presidente Restaurante Ltda".', ocr), false);
  assert.equal(isPlainMerchantName('Sabor do Presidente Restaurante Ltda', ocr), true);
});

test('a merchant cannot be invented when absent from OCR', () => {
  assert.equal(isPlainMerchantName('Restaurante Fictício Ltda', 'Valor Total R$ 45,00'), false);
});


const narrative = [
  'A imagem apresenta um cupom fiscal (NFC-e) impresso em papel térmico branco, posicionado verticalmente contra um fundo escuro.',
  'O documento pertence à LANCHONETE E CHURRASCARIA TOLLUCA, localizada em Castelo Branco, Entre Rios.',
  'No topo, constam as informações de identificação da empresa, incluindo endereço, CNPJ e telefone.',
  'A lista de itens consumidos detalha:',
  '1 Água mineral com gás (510ml) no valor de R$ 6,00.',
  '1 Café expresso no valor de R$ 7,00.',
  'O valor total da compra é de R$ 13,00, com a forma de pagamento registrada como cartão de crédito.',
  'O campo de identificação do cliente indica CONSUMIDOR NÃO IDENTIFICADO.',
  'A chave de acesso para consulta no site da Fazenda de SP.',
  'O número da nota fiscal (110477), série 3, datada de 26/10/2026.',
  'Um QR Code centralizado, destinado à verificação digital da nota.',
  'O rodapé do cupom fornece informações sobre a carga tributária (R$ 4,07, representando 31,31% do valor).'
].join('\n');

test('vision description still supplies seller name without saving explanation', () => {
  const issuer = merchantCandidate(narrative);
  assert.equal(issuer?.value, 'LANCHONETE E CHURRASCARIA TOLLUCA');
  assert.ok((issuer?.confidence ?? 0) >= 80);
});

test('vision description classifies listed food items, not issuer industry', () => {
  const category = categoryCandidate(narrative);
  assert.equal(category?.category, 'alimentacao');
  assert.equal(category?.subcategory, 'Café e água mineral');
  assert.match(category?.evidence ?? '', /Água mineral/);
  assert.match(category?.evidence ?? '', /Café expresso/);
});

test('AI seller explanation is reduced to verified literal seller', () => {
  assert.equal(modelMerchantName(
    'O cabeçalho identifica o restaurante como "LANCHONETE E CHURRASCARIA TOLLUCA".', narrative),
    'LANCHONETE E CHURRASCARIA TOLLUCA');
  assert.equal(modelMerchantName(
    'A empresa correta é Restaurante Inventado SA', narrative), null);
});

test('model item evidence must reference actual purchases', () => {
  assert.equal(categoryEvidenceMatches('Café expresso', narrative,
    'LANCHONETE E CHURRASCARIA TOLLUCA'), true);
  assert.equal(categoryEvidenceMatches('LANCHONETE E CHURRASCARIA TOLLUCA', narrative,
    'LANCHONETE E CHURRASCARIA TOLLUCA'), false);
});


test('remove printed Nome label without changing the establishment name', () => {
  assert.equal(cleanMerchantLabel('Nome: AUTO POSTO ROTA SUL LTDA'), 'AUTO POSTO ROTA SUL LTDA');
  assert.equal(cleanMerchantLabel('Nome： AUTO POSTO ROTA SUL LTDA'), 'AUTO POSTO ROTA SUL LTDA');
  assert.equal(cleanMerchantLabel('AUTO POSTO ROTA SUL LTDA'), 'AUTO POSTO ROTA SUL LTDA');
});

test('OCR merchant labels do not appear in extracted establishment field', () => {
  const issuer = merchantCandidate('Nome: AUTO POSTO ROTA SUL LTDA\nCNPJ: 12.345.678/0001-90\nTOTAL R$ 30,00');
  assert.equal(issuer?.value, 'AUTO POSTO ROTA SUL LTDA');
});
