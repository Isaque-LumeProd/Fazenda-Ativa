import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
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

import { C, MaxW, R, S } from '@/constants/theme';
import type { IconName } from '@/lib/constants';

export function Icon({ name, size = 22, color = C.text }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <View style={st.screen}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
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

type Variante = 'h1' | 'h2' | 'h3' | 'body' | 'muted' | 'small' | 'label';

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
    <Text style={[st[v], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [st.card, style, pressed && st.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[st.card, style]}>{children}</View>;
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
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconName;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const cores = {
    primary: { bg: C.primary, fg: '#fff', border: C.primary },
    secondary: { bg: C.card, fg: C.primary, border: C.primary },
    danger: { bg: C.card, fg: C.danger, border: C.danger },
    ghost: { bg: 'transparent', fg: C.primary, border: 'transparent' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        st.button,
        small && st.buttonSmall,
        { backgroundColor: cores.bg, borderColor: cores.border },
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
    <View style={{ gap: S.xs }}>
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

export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: ChipOpcao<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: S.xs }}>
      {label ? <Txt v="label">{label}</Txt> : null}
      <Row wrap gap={S.sm}>
        {options.map((o) => {
          const ativo = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[st.chip, ativo && { backgroundColor: C.primary, borderColor: C.primary }]}>
              {o.icon ? <Icon name={o.icon} size={16} color={ativo ? '#fff' : (o.cor ?? C.muted)} /> : null}
              <Text style={[st.chipText, ativo && { color: '#fff' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </Row>
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
      <View style={[st.statIcon, { backgroundColor: cor + '1A' }]}>
        <Icon name={icone} size={20} color={cor} />
      </View>
      <Txt v="small">{label}</Txt>
      <Txt v="h2">{valor}</Txt>
      {detalhe ? <Txt v="small">{detalhe}</Txt> : null}
    </Card>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: S.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="h3">{title}</Txt>
        {action}
      </Row>
      {children}
    </View>
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
      {icon ? (
        <View style={[st.statIcon, { backgroundColor: iconColor + '1A' }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontWeight: '600' }} numberOfLines={1}>
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

export function Badge({ text, cor = C.primary, bg }: { text: string; cor?: string; bg?: string }) {
  return (
    <View style={[st.badge, { backgroundColor: bg ?? cor + '1A' }]}>
      <Text style={[st.badgeText, { color: cor }]}>{text}</Text>
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
      <Text style={{ color: cores[0], flex: 1, fontWeight: '600' }}>{text}</Text>
      {onPress ? <Icon name="chevron-right" size={20} color={cores[0]} /> : null}
    </Pressable>
  );
}

export function Progress({ valor, cor = C.primary }: { valor: number; cor?: string }) {
  const pct = Math.max(0, Math.min(1, valor));
  return (
    <View style={st.progress}>
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
      <Icon name={icon} size={40} color={C.muted} />
      <Txt v="h3" style={{ textAlign: 'center' }}>
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

export const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: S.xxl },
  content: { width: '100%', maxWidth: MaxW, padding: S.lg, gap: S.lg },
  footer: { borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card, alignItems: 'center' },
  footerInner: { width: '100%', maxWidth: MaxW, padding: S.lg, paddingBottom: S.xl },
  h1: { fontSize: 26, fontWeight: '700', color: C.text },
  h2: { fontSize: 22, fontWeight: '700', color: C.text },
  h3: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { fontSize: 15, color: C.text },
  muted: { fontSize: 15, color: C.muted },
  small: { fontSize: 13, color: C.muted },
  label: { fontSize: 14, fontWeight: '600', color: C.text },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  pressed: { opacity: 0.6 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    minHeight: 48,
    paddingHorizontal: S.lg,
    borderRadius: R.md,
    borderWidth: 1.5,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: S.md },
  buttonText: { fontSize: 16, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
  },
  input: { flex: 1, fontSize: 16, color: C.text, paddingVertical: S.md, minHeight: 48 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  chipText: { fontSize: 14, color: C.text, fontWeight: '500' },
  stat: { flexGrow: 1, flexBasis: 150, gap: 2 },
  statIcon: { width: 36, height: 36, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  badge: { paddingHorizontal: S.sm, paddingVertical: 2, borderRadius: R.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.md, borderRadius: R.md },
  progress: { height: 8, backgroundColor: C.border, borderRadius: R.pill, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
});
