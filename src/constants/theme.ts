/**
 * Identidade visual inspirada no ChocaFácil: fundo creme, verdes de mato, terracota para a ação
 * principal e tipografia Inter bem pesada nos títulos.
 */
export const C = {
  /** verde folha: botões e destaques */
  primary: '#4B6B45',
  /** verde mata: títulos fortes, chips selecionados */
  primaryDark: '#2D4A33',
  /** verde claro: fundos de destaque */
  primarySoft: '#E6ECDD',
  /** tinta: texto principal */
  text: '#1F3326',
  muted: '#5F6B63',
  bg: '#F7F5EF',
  card: '#FFFFFF',
  /** fundo dos campos de texto e cartões internos */
  field: '#F8F6EE',
  border: '#E8E3D6',
  /** terracota: botão "+ Nova" e chamadas */
  terra: '#B5532F',
  terraSoft: '#F6E6DF',
  areia: '#EFE7D8',
  ouro: '#CBA258',
  danger: '#C2412E',
  dangerSoft: '#FBE9E5',
  warning: '#B7791F',
  warningSoft: '#FBF1DC',
  info: '#2F7A8C',
  infoSoft: '#E2EFF1',
  teal: '#1F9C8A',
  egg: '#CBA258',
  noite: '#0B0D0B',
} as const;

/** Famílias da Inter carregadas em _layout.tsx (cada peso é uma família no React Native) */
export const F = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const R = { sm: 10, md: 14, lg: 22, xl: 28, pill: 999 } as const;

export const MaxW = 720;

/** Sombra suave dos cartões */
export const sombra = {
  shadowColor: '#1F3326',
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
} as const;
