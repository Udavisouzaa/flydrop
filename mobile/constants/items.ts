export const COMMON_ITEM_CATEGORIES = [
  'Roupas',
  'Calçados',
  'Livros',
  'Brinquedos',
  'Cosméticos',
  'Papelaria',
  'Presentes pequenos',
  'Documentos simples',
] as const;

export const ELECTRONIC_CATEGORIES = [
  'Notebook',
  'Celular',
  'Tablet',
  'Smartwatch',
  'Fone de ouvido',
  'Câmera compacta',
  'Acessórios eletrônicos',
] as const;

export const APPROVED_ITEM_CATEGORIES = [
  ...COMMON_ITEM_CATEGORIES,
  ...ELECTRONIC_CATEGORIES,
] as const;
