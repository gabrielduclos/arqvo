export type Language = 'pt' | 'en';

export const DOCUMENT_CATEGORY_CODES = [
  'alimentacao', 'mercado', 'combustivel', 'transporte', 'farmacia',
  'saude', 'moradia', 'contas', 'educacao', 'lazer',
  'compras', 'servicos', 'outros'
] as const;

export type DocumentCategoryCode = typeof DOCUMENT_CATEGORY_CODES[number];

const CATEGORY_LABELS: Record<Language, Record<DocumentCategoryCode, string>> = {
  pt: {
    alimentacao: 'Alimentação',
    mercado: 'Mercado',
    combustivel: 'Combustível',
    transporte: 'Transporte',
    farmacia: 'Farmácia',
    saude: 'Saúde',
    moradia: 'Moradia',
    contas: 'Contas',
    educacao: 'Educação',
    lazer: 'Lazer',
    compras: 'Compras',
    servicos: 'Serviços',
    outros: 'Outros'
  },
  en: {
    alimentacao: 'Food & drinks',
    mercado: 'Groceries',
    combustivel: 'Fuel',
    transporte: 'Transportation',
    farmacia: 'Pharmacy',
    saude: 'Healthcare',
    moradia: 'Housing',
    contas: 'Bills',
    educacao: 'Education',
    lazer: 'Leisure',
    compras: 'Shopping',
    servicos: 'Services',
    outros: 'Other'
  }
};

export function categoryLabel(category: string | null | undefined, language: Language): string {
  if (!category) return language === 'pt' ? 'Não classificado' : 'Uncategorized';
  return CATEGORY_LABELS[language][category as DocumentCategoryCode] ??
    (language === 'pt' ? 'Não classificado' : 'Uncategorized');
}

export function categoryOptions(language: Language) {
  return DOCUMENT_CATEGORY_CODES.map(value => ({
    value,
    label: CATEGORY_LABELS[language][value]
  }));
}
