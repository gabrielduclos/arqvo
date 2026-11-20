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


test('water is food when listed on a gas station receipt', () => {
  const sample = [
    'Razão Social: POSTO NOVA PARADA LTDA ME',
    'CNPJ: 12.345.678/0001-90',
    'Descrição Qtde Un Valor',
    '001 AGUA SEM GAS 500ML 1 UN 4,50',
    'VALOR TOTAL R$ 4,50'
  ].join('\n');
  assert.equal(merchantCandidate(sample)?.value, 'POSTO NOVA PARADA LTDA ME');
  assert.equal(categoryCandidate(sample)?.category, 'alimentacao');
  assert.equal(categoryCandidate(sample)?.subcategory, 'Água mineral');
});

test('natural-language receipt with one water purchase is classified as food', () => {
  const description = 'O cupom fiscal pertence ao POSTO NOVA PARADA LTDA ME. O consumidor comprou uma garrafa de água com gás. Valor total da compra R$ 5,00.';
  assert.equal(categoryCandidate(description)?.category, 'alimentacao');
});

test('item introduction without price supports water', () => {
  const description = ['Produtos comprados:', 'Água 500 ml', 'VALOR TOTAL R$ 4,00'].join('\n');
  assert.equal(categoryCandidate(description)?.category, 'alimentacao');
});

test('photo description saying it recognized water is not confused with header', () => {
  const description = 'A descrição reconhece água como item comprado, no valor de R$ 4,00.';
  assert.equal(categoryCandidate(description)?.category, 'alimentacao');
});

test('water utility bills must not be mistaken for bottled water', () => {
  const text = 'CONTA DE ÁGUA - TARIFA DE SANEAMENTO 56,90';
  assert.notEqual(categoryCandidate(text)?.category, 'alimentacao');
});

test('station name containing combustivel without items is not fuel purchase', () => {
  assert.equal(categoryCandidate('AUTO POSTO NOVA PARADA LTDA ME\nCNPJ: 12.345.678/0001-90\nVALOR TOTAL R$ 5,00'), null);
});

test('OCR slash Razão Social prefix removed but legal business name kept', () => {
  const raw = '/Razão Social: POSTO NOVA PARADA LTDA ME';
  assert.equal(cleanMerchantLabel(raw), 'POSTO NOVA PARADA LTDA ME');
  assert.equal(merchantCandidate(raw + '\nCNPJ: 12.345.678/0001-90')?.value,
    'POSTO NOVA PARADA LTDA ME');
});


const anschauNarrative = [
  'Descrição da Imagem',
  'A imagem é uma fotografia em preto e branco de um cupom fiscal eletrônico (NFC-e).',
  'Conteúdo do Cupom Fiscal',
  'O documento detalha uma transação comercial com as seguintes informações:',
  'Identificação do Estabelecimento: O cupom pertence à empresa ANSCHAU E EMERENCIANO LTDA, situada na Avenida Tancredo Neves, nº 585, centro, Jandaia do Sul - PR.',
  'Lista de Itens: Constam sete itens na nota, incluindo:',
  'Assados em Tiras 400gr com acompanhamento (R$ 89,90)',
  'Muita Carne (R$ 50,00)',
  'Brazerinho kids (R$ 7,90)',
  'Coca Lata (R$ 0,00)',
  'Suco Nattu 300 ML Laranja (R$ 10,00)',
  'Refrigerantes Lata (R$ 7,00)',
  'Pulled Pork Braza (R$ 0,00)',
  'Totais e Pagamento: O valor total da compra é de R$ 164,80, pago através da modalidade Crédito.',
  'Dados de Emissão: A nota foi emitida em 05/10/2026, às 21:07:40.',
  'Elementos Visuais e Técnicos',
  'Códigos de Verificação: Na parte inferior, destaca-se um Código QR centralizado.',
  'Informações Tributárias: Há uma seção detalhando os tributos incidentes, totalizando R$ 53,63.'
].join('\n');

test('ANSCHAU vision description extracts actual business, not word empresa', () => {
  assert.equal(merchantCandidate(anschauNarrative)?.value, 'ANSCHAU E EMERENCIANO LTDA');
  assert.equal(cleanMerchantLabel('empresa ANSCHAU E EMERENCIANO LTDA'), 'ANSCHAU E EMERENCIANO LTDA');
});

test('ANSCHAU vision description preserves all seven product items', () => {
  const scope = receiptItemLines(anschauNarrative);
  assert.equal(scope.explicit, true);
  assert.equal(scope.lines.length, 7);
  assert.ok(scope.lines[0].includes('Assados em Tiras'));
  assert.ok(scope.lines[6].includes('Pulled Pork'));
  assert.ok(!scope.lines.some(line => line.includes('Totais e Pagamento')));
});

test('ANSCHAU cupom categorizes prepared meals as Alimentação, not mixed or Mercado', () => {
  const category = categoryCandidate(anschauNarrative);
  assert.equal(category?.category, 'alimentacao');
  assert.equal(category?.subcategory, 'Alimentação');
  assert.ok(category?.evidence.includes('Assados em Tiras'));
});

test('merchant from prose and meal classification do not depend on company sector', () => {
  const excerpt = [
    'O cupom pertence à empresa POSTO ESTRELA LTDA, situada no centro.',
    'Lista de Itens: Constam dois itens:',
    'Coca Lata R$ 7,00',
    'Assados com acompanhamento R$ 23,00',
    'Totais e Pagamento: R$ 30,00'
  ].join('\n');
  assert.equal(merchantCandidate(excerpt)?.value, 'POSTO ESTRELA LTDA');
  assert.equal(categoryCandidate(excerpt)?.category, 'alimentacao');
});
