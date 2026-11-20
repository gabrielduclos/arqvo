/**
 * Shared, evidence-grounded resolution of receipt metadata.
 *
 * The OCR engine can return a line-by-line receipt or a natural-language
 * description. The classifier may recognize an item that the deterministic
 * word list does not know about. Neither scenario should erase a valid
 * merchant or category just because the model omitted optional evidence keys.
 */
import {
  categoryCandidate, categoryEvidenceMatches, cleanMerchantLabel,
  isPlainMerchantName, merchantCandidate, modelMerchantName,
  normalized, receiptItemLines, evidencedInText
} from './receiptExtraction';

const CATEGORY_ALIASES: Record<string, string> = {
  alimentacao: 'alimentacao',
  alimentos: 'alimentacao',
  'alimentos e bebidas': 'alimentacao',
  'comida e bebida': 'alimentacao',
  restaurante: 'alimentacao',
  refeicoes: 'alimentacao',
  mercado: 'mercado',
  supermercado: 'mercado',
  'supermercado e mercearia': 'mercado',
  combustivel: 'combustivel',
  combustiveis: 'combustivel',
  abastecimento: 'combustivel',
  transporte: 'transporte',
  farmacia: 'farmacia',
  medicamentos: 'farmacia',
  saude: 'saude',
  moradia: 'moradia',
  habitacao: 'moradia',
  contas: 'contas',
  'contas e servicos': 'contas',
  educacao: 'educacao',
  lazer: 'lazer',
  compras: 'compras',
  servicos: 'servicos',
  outros: 'outros',
  'compra mista': 'outros'
};
const MATCHED_CODES = new Set(Object.values(CATEGORY_ALIASES));

export function normalizeCategoryCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = normalized(raw)
    .replace(/^(?:categoria|category)\s+/, '')
    .trim();
  if (MATCHED_CODES.has(value)) return value;
  return CATEGORY_ALIASES[value] ?? null;
}

function modelItemEvidence(model: Record<string, unknown>): string {
  for (const key of ['item_evidence', 'product_evidence', 'evidencia_item', 'product_description']) {
    if (typeof model[key] === 'string' && model[key].trim()) {
      return String(model[key]).trim().slice(0, 250);
    }
  }
  return '';
}

export type ResolvedReceiptMetadata = {
  merchant: string;
  category: string | null;
  subcategory: string;
};

/** Preserve independently verifiable facts; do not make unrelated fields
 * depend on the model returning the exact expected JSON structure.
 */
export function resolveReceiptMetadata(
  extractedText: string,
  fields: Record<string, unknown> | null,
  imageMerchant: string | null = null
): ResolvedReceiptMetadata {
  const model = fields ?? {};
  const OCR = extractedText.trim();
  const issuer = merchantCandidate(OCR);
  const proposedMerchant = modelMerchantName(model.merchant ?? model.estabelecimento, OCR);
  const imageName = imageMerchant && isPlainMerchantName(cleanMerchantLabel(imageMerchant), OCR)
    ? cleanMerchantLabel(imageMerchant) : null;
  const merchant = cleanMerchantLabel(
    imageName ||
    (issuer && issuer.confidence >= 80 ? issuer.value : null) ||
    proposedMerchant ||
    ''
  );

  const itemLines = receiptItemLines(OCR);
  const heuristic = categoryCandidate(OCR);
  const suggested = normalizeCategoryCode(model.category ?? model.categoria);
  const sub = typeof (model.subcategory ?? model.subcategoria) === 'string'
    ? String(model.subcategory ?? model.subcategoria).trim().slice(0, 80) : '';
  const evidence = modelItemEvidence(model);
  const evidenceSupported = !!evidence &&
    categoryEvidenceMatches(evidence, OCR, merchant);
  const subSupported = !!sub && itemLines.lines.some(item => evidencedInText(sub, item));

  // Category evidence can be supplied by: (a) a quoted purchased product,
  // (b) an actual explicit item list, or (c) a subcategory written in a
  // purchased item. This keeps semantic classification useful for new items
  // not in the local dictionary, without inferring a category from shop type.
  const modelGrounded = !!suggested && suggested !== 'outros' &&
    (evidenceSupported || subSupported ||
     (itemLines.explicit && itemLines.lines.length > 0));
  const localStrong = !!heuristic && heuristic.confidence >= 85;
  let category: string | null = null;
  let subcategory = '';
  if (localStrong && heuristic?.category !== 'outros') {
    category = heuristic.category;
    subcategory = heuristic.subcategory;
  } else if (modelGrounded) {
    category = suggested;
    subcategory = sub || (heuristic?.category === suggested ? heuristic.subcategory : '') || '';
  } else if (heuristic) {
    category = heuristic.category;
    subcategory = heuristic.subcategory;
  } else if (suggested === 'outros' && itemLines.explicit && itemLines.lines.length > 1) {
    category = 'outros';
    subcategory = sub || 'Compra mista';
  }

  return { merchant, category, subcategory: category ? subcategory : '' };
}
