import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, MaxW, R, S, sombra } from '@/constants/theme';
import type { IconName } from '@/lib/constants';

export function Icon({ name, size = 22, color = C.text }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function Screen({
  children,
  footer,
  header,
  topo,
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** conteúdo de largura total acima do conteúdo (ex.: cabeçalho escuro da chocada) */
  header?: ReactNode;
  /** tela sem barra de título: respeita o entalhe/relógio no topo */
  topo?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={st.screen}>
      <ScrollView
        contentContainerStyle={[st.scroll, topo && { paddingTop: insets.top + S.sm }]}
        keyboardShouldPersistTaps="handled">
        {header}
        <View style={st.content}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={st.footer}>
          <View style={st.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

type Variante = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'muted' | 'small' | 'label' | 'kicker';

const FAMILIA_POR_PESO: Record<string, string> = {
  normal: F.regular,
  '400': F.regular,
  '500': F.medium,
  '600': F.semibold,
  bold: F.bold,
  '700': F.bold,
  '800': F.extrabold,
  '900': F.black,
};

/** Converte fontWeight em família da Inter (no React Native cada peso é uma fonte separada). */
export function fonte(style: StyleProp<TextStyle>): TextStyle {
  const plano = StyleSheet.flatten(style) ?? {};
  if (!plano.fontWeight) return plano;
  const { fontWeight, ...resto } = plano;
  return { ...resto, fontFamily: FAMILIA_POR_PESO[String(fontWeight)] ?? F.regular };
}

export function Txt({
  children,
  v = 'body',
  style,
  numberOfLines,
}: {
  children: ReactNode;
  v?: Variante;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text style={fonte([st[v], style])} numberOfLines={numberOfLines}>
      {v === 'kicker' && typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
  flat,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** sem sombra (cartão dentro de cartão) */
  flat?: boolean;
}) {
  const base = [st.card, !flat && sombra, flat && st.cardFlat];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, style, pressed && st.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[...base, style]}>{children}</View>;
}

export function Row({
  children,
  gap = S.sm,
  style,
  wrap,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  wrap?: boolean;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, wrap && { flexWrap: 'wrap' }, style]}>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  small,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'terra' | 'dark';
  icon?: IconName;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const cores = {
    primary: { bg: C.primary, fg: '#fff', border: C.primary },
    dark: { bg: C.primaryDark, fg: '#fff', border: C.primaryDark },
    terra: { bg: C.terra, fg: '#fff', border: C.terra },
    secondary: { bg: C.card, fg: C.primaryDark, border: C.border },
    danger: { bg: C.card, fg: C.danger, border: '#F0C9C0' },
    ghost: { bg: 'transparent', fg: C.primary, border: 'transparent' },
  }[variant];
  const cheio = variant === 'primary' || variant === 'dark' || variant === 'terra';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        st.button,
        small && st.buttonSmall,
        { backgroundColor: cores.bg, borderColor: cores.border },
        cheio && !small && st.buttonSombra,
        variant === 'terra' && { shadowColor: C.terra },
        (pressed || disabled) && st.pressed,
        style,
      ]}>
      {icon ? <Icon name={icon} size={small ? 18 : 20} color={cores.fg} /> : null}
      <Text style={[st.buttonText, small && { fontSize: 14 }, { color: cores.fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  suffix,
  hint,
  erro,
  secureTextEntry,
  autoCapitalize,
  autoComplete,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  suffix?: string;
  hint?: string;
  erro?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="label">{label}</Txt> : null}
      <View style={[st.inputWrap, !!erro && { borderColor: C.danger }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA096"
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          accessibilityLabel={label}
          style={[st.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        />
        {suffix ? <Txt v="muted">{suffix}</Txt> : null}
      </View>
      {erro ? <Txt v="small" style={{ color: C.danger }}>{erro}</Txt> : hint ? <Txt v="small">{hint}</Txt> : null}
    </View>
  );
}

export interface ChipOpcao<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  cor?: string;
}

export function Chip({
  label,
  ativo,
  onPress,
  icon,
  cor,
  escuro,
}: {
  label: string;
  ativo?: boolean;
  onPress?: () => void;
  icon?: IconName;
  cor?: string;
  /** chip selecionado em verde-mata (filtros), em vez de verde-claro */
  escuro?: boolean;
}) {
  const sel = escuro
    ? { backgroundColor: C.primaryDark, borderColor: C.primaryDark }
    : { backgroundColor: C.primarySoft, borderColor: C.primary };
  const fg = ativo ? (escuro ? '#fff' : C.primaryDark) : C.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.chip, ativo && sel, pressed && st.pressed]}>
      {ativo && !escuro && !icon ? <Icon name="check" size={16} color={C.primaryDark} /> : null}
      {icon ? <Icon name={icon} size={16} color={ativo ? fg : (cor ?? C.muted)} /> : null}
      <Text style={[st.chipText, { color: fg }, ativo && { fontFamily: F.semibold }]}>{label}</Text>
    </Pressable>
  );
}

export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  escuro,
}: {
  label?: string;
  options: ChipOpcao<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  escuro?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="label">{label}</Txt> : null}
      <Row wrap gap={S.sm}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            icon={o.icon}
            cor={o.cor}
            escuro={escuro}
            ativo={o.value === value}
            onPress={() => onChange(o.value)}
          />
        ))}
      </Row>
    </View>
  );
}

/** Ícone dentro de um quadradinho arredondado de fundo suave */
export function IconBox({
  name,
  cor = C.primary,
  bg,
  size = 44,
}: {
  name: IconName;
  cor?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: bg ?? C.field,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={name} size={size * 0.5} color={cor} />
    </View>
  );
}

export function Stat({
  label,
  valor,
  icone,
  cor = C.primary,
  detalhe,
  onPress,
}: {
  label: string;
  valor: string;
  icone: IconName;
  cor?: string;
  detalhe?: string;
  onPress?: () => void;
}) {
  return (
    <Card style={st.stat} onPress={onPress}>
      <IconBox name={icone} cor={cor} bg={cor + '1A'} size={38} />
      <Txt v="small" style={{ marginTop: 6 }}>
        {label}
      </Txt>
      <Txt v="h2">{valor}</Txt>
      {detalhe ? <Txt v="small">{detalhe}</Txt> : null}
    </Card>
  );
}

/** Faixa de números lado a lado com divisórias (ex.: 12 Ovos | Dia 7 | 20:00) */
export function StatRow({
  itens,
  flat,
}: {
  itens: { valor: string; label: string; icone?: IconName; cor?: string }[];
  flat?: boolean;
}) {
  return (
    <Card flat={flat} style={{ flexDirection: 'row', paddingHorizontal: S.sm, paddingVertical: S.lg }}>
      {itens.map((it, i) => (
        <View key={it.label} style={[st.statCol, i > 0 && st.statDiv]}>
          {it.icone ? <IconBox name={it.icone} cor={it.cor ?? C.primaryDark} size={34} /> : null}
          <Txt style={st.statValor} numberOfLines={1}>
            {it.valor}
          </Txt>
          <Txt v="small" numberOfLines={1} style={{ textAlign: 'center' }}>
            {it.label}
          </Txt>
        </View>
      ))}
    </Card>
  );
}

export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="h2">{title}</Txt>
          {subtitle ? <Txt v="muted">{subtitle}</Txt> : null}
        </View>
        {action}
      </Row>
      {children}
    </View>
  );
}

/** Link discreto alinhado à direita: "Ver chocadas ↗" */
export function LinkAcao({ title, onPress, icon = 'arrow-top-right' }: { title: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4 }, pressed && st.pressed]}>
      <Txt style={{ color: C.primary, fontFamily: F.semibold }}>{title}</Txt>
      <Icon name={icon} size={18} color={C.primary} />
    </Pressable>
  );
}

export function ListItem({
  icon,
  iconColor = C.primary,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} style={st.listItem}>
      {icon ? <IconBox name={icon} cor={iconColor} bg={iconColor + '18'} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontFamily: F.semibold, fontSize: 16 }} numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt v="small" numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Icon name="chevron-right" color={C.muted} /> : null}
    </Card>
  );
}

/** Linha de lista dentro de um cartão agrupado (sem cartão próprio, com divisória) */
export function Linha({
  icon,
  iconColor = C.primary,
  title,
  subtitle,
  right,
  onPress,
  primeira,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  primeira?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [st.linha, !primeira && st.linhaDiv, pressed && st.pressed]}>
      {icon ? <IconBox name={icon} cor={iconColor} bg={iconColor === C.primary ? C.primarySoft : iconColor + '18'} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontFamily: F.semibold, fontSize: 16 }} numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt v="small" numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Icon name="chevron-right" color={C.muted} /> : null}
    </Pressable>
  );
}

/** Cartão que agrupa várias <Linha> */
export function Grupo({ children }: { children: ReactNode }) {
  return <Card style={{ padding: 0, overflow: 'hidden' }}>{children}</Card>;
}

export function Badge({ text, cor = C.primary, bg }: { text: string; cor?: string; bg?: string }) {
  return (
    <View style={[st.badge, { backgroundColor: bg ?? cor + '1A' }]}>
      <Text style={[st.badgeText, { color: cor }]}>{text}</Text>
    </View>
  );
}

/** Etiqueta verde-clara como "Dupla aptidão" / "80–150 ovos/ano" */
export function Tag({ text }: { text: string }) {
  return (
    <View style={st.tag}>
      <Text style={st.tagText}>{text}</Text>
    </View>
  );
}

export function Banner({
  icon,
  text,
  tipo = 'warning',
  onPress,
}: {
  icon: IconName;
  text: string;
  tipo?: 'warning' | 'danger' | 'info';
  onPress?: () => void;
}) {
  const cores = {
    warning: [C.warning, C.warningSoft],
    danger: [C.danger, C.dangerSoft],
    info: [C.info, C.infoSoft],
  }[tipo];
  return (
    <Pressable onPress={onPress} style={[st.banner, { backgroundColor: cores[1] }]}>
      <Icon name={icon} size={20} color={cores[0]} />
      <Text style={{ color: cores[0], flex: 1, fontFamily: F.semibold, fontSize: 14 }}>{text}</Text>
      {onPress ? <Icon name="chevron-right" size={20} color={cores[0]} /> : null}
    </Pressable>
  );
}

/** Cartão de destaque "AGORA / Início da incubação" */
export function Aviso({
  kicker,
  title,
  text,
  icon = 'flag-outline',
  cor = C.warning,
  bg = C.warningSoft,
  onPress,
}: {
  kicker?: string;
  title: string;
  text?: string;
  icon?: IconName;
  cor?: string;
  bg?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [st.aviso, { backgroundColor: bg }, pressed && st.pressed]}>
      <IconBox name={icon} cor={cor} bg={cor + '22'} />
      <View style={{ flex: 1, gap: 1 }}>
        {kicker ? <Txt v="kicker" style={{ color: cor, fontSize: 12 }}>{kicker}</Txt> : null}
        <Txt style={{ fontFamily: F.bold, fontSize: 17 }}>{title}</Txt>
        {text ? <Txt v="small">{text}</Txt> : null}
      </View>
      {onPress ? <Icon name="chevron-right" color={C.muted} /> : null}
    </Pressable>
  );
}

export function Progress({ valor, cor = C.primary, altura = 8 }: { valor: number; cor?: string; altura?: number }) {
  const pct = Math.max(0, Math.min(1, valor));
  return (
    <View style={[st.progress, { height: altura }]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: cor, borderRadius: R.pill }} />
    </View>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: IconName;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: S.xxl, gap: S.sm }}>
      <IconBox name={icon} cor={C.primary} bg={C.primarySoft} size={64} />
      <Txt v="h3" style={{ textAlign: 'center', marginTop: S.sm }}>
        {title}
      </Txt>
      {text ? (
        <Txt v="muted" style={{ textAlign: 'center' }}>
          {text}
        </Txt>
      ) : null}
      {action}
    </Card>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <View style={st.grid}>{children}</View>;
}

/** Abas em pílula: Resumo | Ovoscopia | Histórico */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={st.seg}>
      {options.map((o) => {
        const ativo = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            style={[st.segItem, ativo && st.segAtivo]}>
            <Text style={[st.segText, ativo && { color: C.text, fontFamily: F.bold }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Cartão de formulário numerado: ① Nome da chocada */
export function Passo({
  n,
  title,
  subtitle,
  children,
}: {
  n: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card style={{ gap: S.md }}>
      <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
        <View style={st.passoN}>
          <Text style={st.passoNText}>{n}</Text>
        </View>
        <View style={{ flex: 1, gap: 2, paddingTop: 4 }}>
          <Txt v="h3" style={{ fontSize: 19 }}>
            {title}
          </Txt>
          {subtitle ? <Txt v="muted">{subtitle}</Txt> : null}
        </View>
      </Row>
      {children}
    </Card>
  );
}

/** − 12 + */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  passo = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  passo?: number;
}) {
  return (
    <View style={st.stepper}>
      <Pressable hitSlop={8} onPress={() => onChange(Math.max(min, value - passo))} style={st.stepperBtn} accessibilityLabel="Diminuir">
        <Icon name="minus" size={26} />
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(t) => {
          const n = parseInt(t.replace(/\D/g, ''), 10);
          onChange(Number.isFinite(n) ? Math.min(max, n) : 0);
        }}
        keyboardType="number-pad"
        style={st.stepperValor}
      />
      <Pressable hitSlop={8} onPress={() => onChange(Math.min(max, value + passo))} style={st.stepperBtn} accessibilityLabel="Aumentar">
        <Icon name="plus" size={26} />
      </Pressable>
    </View>
  );
}

/** Painel que sobe de baixo (bottom sheet) com título e botão de fechar */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.sheetFundo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={[st.sheet, { paddingBottom: Math.max(insets.bottom, S.lg) + S.sm }]}>
          <Row style={{ justifyContent: 'space-between', marginBottom: S.md }}>
            <Txt v="h2" style={{ flex: 1 }}>
              {title}
            </Txt>
            <Pressable onPress={onClose} style={st.fechar} hitSlop={8} accessibilityLabel="Fechar">
              <Icon name="close" size={22} color={C.muted} />
            </Pressable>
          </Row>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S.md }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={{ marginTop: S.lg, gap: S.sm }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

/** Lista numerada (passos de um guia) */
export function Passos({ itens }: { itens: string[] }) {
  return (
    <View style={{ gap: S.md }}>
      {itens.map((t, i) => (
        <Row key={i} gap={S.md} style={{ alignItems: 'flex-start' }}>
          <View style={[st.passoN, { width: 30, height: 30 }]}>
            <Text style={[st.passoNText, { fontSize: 14 }]}>{i + 1}</Text>
          </View>
          <Txt style={{ flex: 1, fontSize: 16, lineHeight: 24 }}>{t}</Txt>
        </Row>
      ))}
    </View>
  );
}

/** Cabeçalho de página com "kicker" em caixa alta: DOMINGO, 4 DE OUTUBRO / Boa noite */
export function Cabecalho({
  kicker,
  title,
  subtitle,
  right,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View style={{ flex: 1, gap: 4 }}>
        {kicker ? <Txt v="kicker">{kicker}</Txt> : null}
        <Txt v="display">{title}</Txt>
        {subtitle ? <Txt v="muted" style={{ fontSize: 16 }}>{subtitle}</Txt> : null}
      </View>
      {right}
    </Row>
  );
}

export const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: S.xxl },
  content: { width: '100%', maxWidth: MaxW, padding: S.lg, paddingTop: S.lg, gap: S.xl - 4 },
  footer: { borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg, alignItems: 'center' },
  footerInner: { width: '100%', maxWidth: MaxW, padding: S.lg, paddingBottom: S.xl },
  display: { fontSize: 32, fontFamily: F.extrabold, color: C.text, letterSpacing: -0.8 },
  h1: { fontSize: 28, fontFamily: F.extrabold, color: C.text, letterSpacing: -0.6 },
  h2: { fontSize: 22, fontFamily: F.bold, color: C.text, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontFamily: F.bold, color: C.text, letterSpacing: -0.2 },
  body: { fontSize: 15, color: C.text, fontFamily: F.regular },
  muted: { fontSize: 15, color: C.muted, fontFamily: F.regular },
  small: { fontSize: 13, color: C.muted, fontFamily: F.regular },
  label: { fontSize: 14, fontFamily: F.semibold, color: C.muted },
  kicker: { fontSize: 13, fontFamily: F.semibold, color: C.muted, letterSpacing: 1.8 },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: '#EFEBE1',
  },
  cardFlat: { backgroundColor: C.field, borderColor: C.border },
  pressed: { opacity: 0.6 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    minHeight: 54,
    paddingHorizontal: S.xl,
    borderRadius: R.pill,
    borderWidth: 1.5,
  },
  buttonSombra: {
    shadowColor: C.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: S.lg },
  buttonText: { fontSize: 17, fontFamily: F.bold },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
  },
  input: { flex: 1, fontSize: 16, color: C.text, paddingVertical: S.md, minHeight: 52, fontFamily: F.regular },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: S.lg,
    paddingVertical: 9,
    borderRadius: R.pill,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chipText: { fontSize: 15, color: C.text, fontFamily: F.medium },
  stat: { flexGrow: 1, flexBasis: 150, gap: 2 },
  statCol: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  statDiv: { borderLeftWidth: 1, borderLeftColor: C.border },
  statValor: { fontSize: 24, fontFamily: F.extrabold, color: C.text, letterSpacing: -0.5 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, paddingHorizontal: S.lg },
  linhaDiv: { borderTopWidth: 1, borderTopColor: C.border },
  badge: { paddingHorizontal: S.sm + 2, paddingVertical: 3, borderRadius: R.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontFamily: F.bold },
  tag: { backgroundColor: C.primarySoft, paddingHorizontal: S.md, paddingVertical: 4, borderRadius: R.pill },
  tagText: { fontSize: 13, fontFamily: F.semibold, color: C.primaryDark },
  banner: { flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.md, borderRadius: R.md },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: R.lg },
  progress: { backgroundColor: '#ECE8DD', borderRadius: R.pill, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  seg: { flexDirection: 'row', backgroundColor: '#ECE9E0', borderRadius: R.md + 2, padding: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: R.md - 2 },
  segAtivo: { backgroundColor: C.card, ...sombra },
  segText: { fontSize: 15, color: C.muted, fontFamily: F.medium },
  passoN: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoNText: { color: '#fff', fontFamily: F.bold, fontSize: 16 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    paddingHorizontal: S.sm,
  },
  stepperBtn: { width: 56, height: 64, alignItems: 'center', justifyContent: 'center' },
  stepperValor: {
    width: 120,
    textAlign: 'center',
    fontSize: 40,
    fontFamily: F.extrabold,
    color: C.text,
    letterSpacing: -1,
  },
  sheetFundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,51,38,0.35)' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: S.xl,
    paddingBottom: S.xl,
    maxHeight: '88%',
    width: '100%',
    maxWidth: MaxW,
    alignSelf: 'center',
  },
  fechar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
