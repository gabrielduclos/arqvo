/**
 * Evidence-first OCR parsing for Brazilian receipts, invoices and payment slips.
 * Never use the issuer's trade, header or address as evidence of purchased items.
 */
export type MerchantCandidate = { value: string; source: 'label' | 'cnpj' | 'header'; confidence: number };
export type CategoryCandidate = { category: string; subcategory: string; evidence: string; confidence: number };

export function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const docHeading = /^(?:nota(?:\s+fiscal)?|nfc.?e|nf.?e|danfe|cupom(?:\s+fiscal)?|recibo|documento(?:\s+auxiliar)?|extrato|pedido|consumidor|chave\s+de\s+acesso|protocolo|emiss[aã]o|emitid[oa]|data|hora|p[aá]gina|total|valor|subtotal|quantidade|descri[cç][aã]o|item|codigo|c[oó]d\.?|qr\s*code|consulta|secretaria|fazenda|tributos|impostos|simples\s+nacional|informac[oõ]es|endereco|endere[cç]o|rodov|bairro|cep|cidade|uf|telefone|tel\.?|obrigad[oa]|volte\s+sempre|pagamento|cart[aã]o|pix|autorizacao|comprovante|estabelecimento\s*[:.]?$)/i;
const nonIssuer = /\b(?:https?:|www\.|@|cpf|cnpj|qr\s*code|chave\s*de\s*acesso|autorizacao|valor\s*total|consumidor|documento\s*auxiliar|nota\s*fiscal|comprovante\s*de\s*pagamento)\b/i;
const address = /^(?:r(?:ua)?\.?\s|av(?:enida)?\.?\s|rod(?:ovia)?\.?\s|estrada\b|logradouro\b|pra[cç]a\b|travessa\b|bairro\b|cep\b|n[º°o]\s*\d)/i;
const price = /(?:R\$\s*|(?:^|\s))\d{1,6}[,.]\d{2}(?:\s|$)/;
const cnpjPattern = /\b(?:cnpj|c\s*n\s*p\s*j)\s*[:.#-]?\s*(?:\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/i;
const corporateSuffix = /^(?:LTDA\.?|LIMITADA|ME|EPP|EIRELI|S\.?A\.?|S\/A)\s*[,.]?$/i;
const summaryOrNarration = /\b(?:o\s+cabecalho|a\s+nota|o\s+documento|identifica|identificado\s+como|mostra\s+o|indica\s+que|consta\s+como|parece\s+ser|provavelmente|o\s+estabelecimento\s+(?:e|se\s+chama)|o\s+restaurante\s+(?:e|se\s+chama)|nome\s+do\s+estabelecimento\s+e|segundo\s+o\s+texto|com\s+base\s+no|encontrado\s+na\s+nota)\b/i;

export function isPlainMerchantName(candidate: string, ocrText: string): boolean {
  const name = candidate.trim().replace(/^[\"“”'‘’]+|[\"“”'‘’]+$/g, '');
  const flat = normalized(name);
  // A name has to be a concise, literal issuer name, never a sentence that
  // explains which name the OCR or LLM thinks it found.
  if (name.length < 4 || name.length > 125 || flat.split(' ').length > 17 ||
      summaryOrNarration.test(flat) || /[\n\r:!?]/.test(name) ||
      /[.!?]\s*$/.test(name)) return false;
  if (!looksIssuer(name)) return false;
  // A real merchant must be written somewhere in the OCR input. This rejects
  // hallucinated brands and conversational AI response strings.
  return normalized(ocrText).includes(flat);
}


function issuerValue(value: string): string {
  return value.replace(/^(?:[-–—:]\s*)+/, '')
    .replace(/\s+(?:CNPJ|CPF)\s*[:.]?\s*\d.*$/i, '')
    .replace(/\s{2,}/g, ' ').trim().slice(0, 160);
}
function looksIssuer(value: string): boolean {
  const clean = issuerValue(value);
  const flat = normalized(clean);
  if (flat.length < 4 || flat.length > 130 || !/[a-z]{3}/i.test(flat)) return false;
  // Legal suffixes and one-word OCR artifacts are not the issuer name.
  if (corporateSuffix.test(clean) || flat.split(' ').length === 1 && /^(?:ltda|eireli|limitada|microempresa|fantasia)$/.test(flat)) return false;
  if (summaryOrNarration.test(flat)) return false;
  if (docHeading.test(flat) || nonIssuer.test(flat) || address.test(flat)) return false;
  if (/^\d/.test(flat) || (clean.match(/\d/g) || []).length > 7) return false;
  if (price.test(clean) || /[0-9]{2}[:/.-][0-9]{2}/.test(clean)) return false;
  if (/^(?:pag|cod|num|serie|serie\s*nf|produto|qtd|qtde)\b/i.test(flat)) return false;
  return true;
}

export function merchantCandidate(text: string): MerchantCandidate | null {
  const lines = text.split(/\r?\n/).map(line => line.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 120);
  // Prefer explicit issuer fields, including labels whose value appears on the following line.
  const issuerLabel = /^(?:nome\s*fantasia|raz[aã]o\s*social|nome\s*empresarial|nome\s+do\s+(?:emitente|estabelecimento)|estabelecimento|emitente|fornecedor|vendedor)\s*[:\-]?\s*(.*)$/i;
  for (let i = 0; i < Math.min(70, lines.length); i++) {
    const match = lines[i].match(issuerLabel);
    if (!match) continue;
    const candidate = issuerValue(match[1] || lines[i + 1] || '');
    if (looksIssuer(candidate)) return { value: candidate, source: 'label', confidence: 98 };
  }

  // NFC-e often places the issuer beside its CNPJ, sometimes with an OCR
  // artifact such as "5", and continues "LTDA" onto the next line.
  // Look at every early CNPJ rather than accepting a standalone "LTDA".
  for (let i = 0; i < Math.min(35, lines.length); i++) {
    const match = lines[i].match(cnpjPattern);
    if (!match) continue;
    const suffix = lines[i].slice((match.index ?? 0) + match[0].length)
      .replace(/^[\s:;,.\-–]+/, '')
      .replace(/^\d{1,2}\s+(?=[a-zA-ZÀ-ÿ]{3})/, '').trim();
    if (looksIssuer(suffix)) {
      let complete = issuerValue(suffix);
      const continuation = lines[i + 1];
      if (continuation && corporateSuffix.test(continuation) &&
          !new RegExp('\\b' + normalized(continuation) + '\\b', 'i').test(normalized(complete))) {
        complete += ' ' + continuation.trim().replace(/[,.]+$/, '');
      }
      return { value: complete.slice(0, 160), source: 'cnpj', confidence: 94 };
    }
    // Header above CNPJ is the second-most reliable position. Reject footer
    // vendors or payment processors by inspecting only very nearby lines.
    for (const offset of [-1, -2, -3]) {
      const line = lines[i + offset];
      if (line && looksIssuer(line)) {
        const part = lines[i + offset + 1];
        const name = issuerValue(line) + (part && corporateSuffix.test(part) ? ' ' + part : '');
        return { value: name.slice(0, 160), source: 'cnpj', confidence: 86 };
      }
    }
    // The issuer may appear below a CNPJ-only line.
    const below = lines[i + 1];
    if (below && looksIssuer(below)) {
      const next = lines[i + 2];
      return {
        value: (issuerValue(below) + (next && corporateSuffix.test(next) ? ' ' + next : '')).slice(0, 160),
        source: 'cnpj', confidence: 82
      };
    }
  }

  // Bare header is a weak hint, never authoritative when model evidence differs.
  for (const line of lines.slice(0, 9)) {
    if (looksIssuer(line)) return { value: issuerValue(line), source: 'header', confidence: 52 };
  }
  return null;
}

const itemHeader = /(?:^|\b)(?:descri[cç][aã]o(?:\s+dos?\s+(?:produtos?|servi[cç]os?|itens?))?|detalhamento\s+(?:dos?\s+)?(?:itens?|produtos?)|itens?\s+(?:comprados|adquiridos|da\s+compra)|produtos?\s+adquiridos|c[oó]d(?:igo)?\s+descri[cç][aã]o|descri[cç][aã]o\s+(?:qtd|qtde|valor|quantidade)|item\s+c[oó]d(?:igo)?|produto\s+(?:qtd|qtde))\b/i;
const stopItems = /^(?:total(?:\s+(?:geral|a\s+pagar|da\s+nota|da\s+compra))?|subtotal|resumo\s+de|pagamento|forma\s+de\s+pagamento|cart[aã]o|pix|troco|desconto|imposto|tributos|informac[oõ]es|consulta|protocolo|consumidor|cpf|cnpj|chave|qr\s*code|observac[oõ]es|valor\s+(?:pago|total|a\s+pagar))\b/i;
const itemNoise = /^(?:item\s+(?:c[oó]d|descri[cç][aã]o)|cod(?:igo)?\s+(?:descri[cç][aã]o|qtd)|descri[cç][aã]o\s+(?:qtd|qtde|valor|quantidade)|qtd\s+(?:unidade|valor)|qtde\s+(?:unidade|valor)|quantidade\s+(?:unidade|valor)|unidade\s+valor|valor\s*un|vl\s*un|vl\s*total|ncm\s+cfop|cfop\s+ncm|pre[cç]o\s+unit|R\$\s*$|serie\s+nota)\b/i;

function priceRow(line: string): boolean {
  return price.test(line) || /\d+(?:[,.]\d+)?\s*(?:un|und|kg|l|lt|cx|pc)\s/i.test(line)
    || /^\s*\d{1,3}\s+[^\d]{4,80}\s+\d{1,7}[,.]\d{2}\s*$/.test(line);
}
function meaningfulItem(line: string): boolean {
  return line.length >= 3 && /[a-zA-ZÀ-ÿ]{3}/.test(line) &&
    !stopItems.test(line) && !itemNoise.test(line) &&
    !docHeading.test(line) && !nonIssuer.test(line) && !address.test(line) &&
    !/\b(?:subtotal|total|troco|imposto|tribut|desconto|cnpj|cpf|telefone|saldo|cartao|cr[eé]dito|d[eé]bito)\b/i.test(line);
}

export function receiptItemLines(text: string): { lines: string[]; explicit: boolean } {
  const lines = text.split(/\r?\n/).map(line => line.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 450);
  const start = lines.findIndex(line => itemHeader.test(line));
  if (start >= 0) {
    const result: string[] = [];
    for (const line of lines.slice(start + 1, start + 65)) {
      if (stopItems.test(line)) break;
      if (meaningfulItem(line)) result.push(line);
    }
    return { lines: result.slice(0, 40), explicit: true };
  }
  // Without an item marker only use priced/product-shaped lines.
  // Plain header lines, issuer names and "gas station" don't qualify.
  const candidates = lines.filter(line => priceRow(line) && meaningfulItem(line));
  return { lines: candidates.slice(0, 30), explicit: false };
}

type CategoryRule = { code: string; sub: string; rx: RegExp };
const categories: CategoryRule[] = [
  { code: 'combustivel', sub: 'Abastecimento', rx: /\b(?:gasolina|etanol|diesel|gas\s+natural\s+veicular|gnv|litros?\s+abastecidos?|abastecimento)\b/i },
  { code: 'farmacia', sub: 'Medicamentos', rx: /\b(?:dipirona|paracetamol|ibuprofeno|medicamentos?|comprimidos?|rem[eé]dios?|antibi[oó]ticos?|pomadas?|fraldas?\s+geri[aá]tricas?)\b/i },
  { code: 'saude', sub: 'Saúde', rx: /\b(?:consulta\s+m[eé]dica|exame\s+laboratorial|exame\s+de\s+sangue|dentista|odontol[oó]gic|fisioterapia)\b/i },
  { code: 'transporte', sub: 'Transporte', rx: /\b(?:passagem\s+(?:[oô]nibus|rodovi[aá]ria)|corrida\s+(?:uber|99|t[aá]xi)|ped[aá]gio|estacionamento|bilhete\s+de\s+transporte)\b/i },
  { code: 'moradia', sub: 'Moradia', rx: /\b(?:aluguel|condom[ií]nio|iptu|reforma\s+residencial)\b/i },
  { code: 'contas', sub: 'Contas', rx: /\b(?:energia\s+el[eé]trica|conta\s+de\s+(?:luz|[aá]gua|g[aá]s|internet|telefone)|fatura\s+(?:de\s+)?(?:energia|[aá]gua|internet))\b/i },
  { code: 'educacao', sub: 'Educação', rx: /\b(?:mensalidade\s+escolar|curso\s+online|matr[ií]cula\s+escolar|apostila\s+did[aá]tica)\b/i },
  { code: 'lazer', sub: 'Lazer', rx: /\b(?:ingresso\s+(?:cinema|teatro|show|parque)|cinema|parque\s+aqu[aá]tico|show\s+musical)\b/i },
  { code: 'servicos', sub: 'Serviços', rx: /\b(?:servi[cç]o\s+(?:de\s+)?(?:manuten[cç][aã]o|instala[cç][aã]o|limpeza|reparo)|conserto|lavagem\s+automotiva|corte\s+de\s+cabelo)\b/i },
  { code: 'compras', sub: 'Compras', rx: /\b(?:camisetas?|cal[cç]as?|t[eê]nis|sapatos?|roupas?|fones?\s+de\s+ouvido|celular|carregador|brinquedos?)\b/i },
  { code: 'mercado', sub: 'Mercado', rx: /\b(?:arroz|feij[aã]o|a[cç][uú]car|macarr[aã]o|farinha|detergente|sab[aã]o|alvejante|papel\s+higi[eê]nico|frutas?|verduras?|legumes?|carnes?|leite\s+em\s+p[oó])\b/i },
  { code: 'alimentacao', sub: 'Alimentação', rx: /\b(?:caf[eé]|coffee|espresso|expresso|capuccino|cappuccino|p[aã]o\s+de\s+queijo|p[aã]o|lanche|sandu[ií]che|refei[cç][aã]o|almo[cç]o|jantar|pizza|salgados?|suco|[aá]gua\s+mineral|refrigerante|ch[aá]|biscoito|bolo|sorvete|hamb[uú]rguer)\b/i }
];

export function categoryCandidate(text: string): CategoryCandidate | null {
  const scope = receiptItemLines(text);
  if (!scope.lines.length) return null;
  const found = new Map<string, CategoryRule>();
  const evidence: string[] = [];
  for (const line of scope.lines) {
    const normalizedLine = normalized(line);
    for (const rule of categories) {
      // Normalize the pattern source only via accents in the original OCR line.
      // The regex includes accent variants to avoid rewriting potentially meaningful tokens.
      if (rule.rx.test(line) || rule.rx.test(normalizedLine)) {
        found.set(rule.code, rule);
        evidence.push(line);
      }
    }
  }
  if (!found.size) return null;
  if (found.has('mercado') && found.has('alimentacao')) {
    // Multiple grocery staples are still supermarket purchases.
    const marketRows = scope.lines.filter(line => categories.find(rule => rule.code === 'mercado')!.rx.test(line));
    if (marketRows.length >= 2) found.delete('alimentacao');
  }
  if (found.size > 1) return { category: 'outros', subcategory: 'Compra mista', evidence: evidence.slice(0, 4).join(' | '), confidence: scope.explicit ? 82 : 60 };
  const rule = [...found.values()][0];
  const subcategory = rule.code === 'alimentacao'
    ? /\b(?:caf[eé]|coffee|espresso|expresso|capuccino|cappuccino)\b/i.test(scope.lines.join(' ')) ? 'Café' : 'Alimentação'
    : rule.sub;
  return {
    category: rule.code, subcategory, evidence: evidence.slice(0, 3).join(' | '),
    confidence: scope.explicit ? 94 : 72
  };
}

export function evidencedInText(candidate: string, text: string): boolean {
  const name = normalized(candidate);
  if (name.length < 4) return false;
  const tokens = name.split(' ').filter(token => token.length >= 3 && !['ltda', 'eireli', 'me', 'comercio', 'servicos'].includes(token));
  const full = normalized(text);
  return (tokens.length > 0 && tokens.filter(token => full.includes(token)).length >= Math.max(1, Math.ceil(tokens.length * 0.7)));
}
