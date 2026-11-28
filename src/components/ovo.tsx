import { useId, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { C } from '@/constants/theme';

function caminhoOvo(cx: number, cy: number, rx: number, ry: number) {
  const top = cy - ry;
  const bot = cy + ry;
  return [
    `M ${cx} ${top}`,
    `C ${cx + rx * 0.8} ${top} ${cx + rx} ${cy - ry * 0.12} ${cx + rx} ${cy + ry * 0.22}`,
    `C ${cx + rx} ${cy + ry * 0.74} ${cx + rx * 0.56} ${bot} ${cx} ${bot}`,
    `C ${cx - rx * 0.56} ${bot} ${cx - rx} ${cy + ry * 0.74} ${cx - rx} ${cy + ry * 0.22}`,
    `C ${cx - rx} ${cy - ry * 0.12} ${cx - rx * 0.8} ${top} ${cx} ${top} Z`,
  ].join(' ');
}

/** Veias saindo do embrião, mais numerosas conforme o desenvolvimento */
function veias(cx: number, cy: number, raio: number, qtd: number) {
  const out: string[] = [];
  for (let i = 0; i < qtd; i++) {
    const a = (i / qtd) * Math.PI * 2 + 0.4;
    const x1 = cx + Math.cos(a) * raio;
    const y1 = cy + Math.sin(a) * raio;
    const x2 = cx + Math.cos(a + 0.35) * raio * 2.2;
    const y2 = cy + Math.sin(a + 0.35) * raio * 2.2;
    const x3 = cx + Math.cos(a + 0.1) * raio * 3.4;
    const y3 = cy + Math.sin(a + 0.1) * raio * 3.4;
    out.push(`M ${cx} ${cy} Q ${x1} ${y1} ${x2} ${y2} T ${x3} ${y3}`);
  }
  return out;
}

/**
 * O ovo visto na lanterna (ovoscopia) num dia da incubação.
 * `p`: 0..1 do desenvolvimento. `anel`: 0..1 do anel de progresso em volta.
 */
export function Ovo({
  p,
  anel = p,
  tamanho = 180,
  escuro = false,
}: {
  p: number;
  anel?: number;
  tamanho?: number;
  /** anel escuro (tela preta da chocada) ou creme (cartão da tela Hoje) */
  escuro?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const s = tamanho;
  const c = s / 2;
  const traco = s * (escuro ? 0.022 : 0.075);
  const rAnel = c - traco / 2 - 1;
  const circ = 2 * Math.PI * rAnel;
  const rDisco = escuro ? rAnel - s * 0.1 : rAnel - traco / 2 - s * 0.015;
  const rx = rDisco * (escuro ? 0.56 : 0.62);
  const ry = rDisco * (escuro ? 0.74 : 0.8);
  const cy = c + ry * 0.02;
  const ovo = caminhoOvo(c, cy, rx, ry);
  const q = Math.max(0, Math.min(1, p));

  const embriaoR = rx * (0.06 + q * 0.32);
  const ex = c + rx * 0.05;
  const ey = cy + ry * 0.08;
  const nVeias = q < 0.1 ? 0 : Math.round(4 + q * 8);
  const escurecer = q < 0.35 ? 0 : Math.min(0.88, (q - 0.35) * 1.6);
  const camaraAr = ry * (0.16 + q * 0.32);

  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s}>
        <Defs>
          <RadialGradient id={`luz${uid}`} cx="50%" cy="56%" r="60%">
            <Stop offset="0%" stopColor="#FFB13B" />
            <Stop offset="55%" stopColor="#F07A12" />
            <Stop offset="100%" stopColor="#C2410C" />
          </RadialGradient>
          <RadialGradient id={`emb${uid}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#7A1F08" stopOpacity={0.95} />
            <Stop offset="100%" stopColor="#B4320C" stopOpacity={0.2} />
          </RadialGradient>
          <ClipPath id={`clip${uid}`}>
            <Path d={ovo} />
          </ClipPath>
        </Defs>

        {/* anel de progresso */}
        <Circle cx={c} cy={c} r={rAnel} stroke={escuro ? '#2B2A22' : C.areia} strokeWidth={traco} fill={escuro ? 'transparent' : C.noite} />
        {anel > 0 ? (
          <Circle
            cx={c}
            cy={c}
            r={rAnel}
            stroke={C.ouro}
            strokeWidth={escuro ? traco * 1.6 : traco * 0.55}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${Math.max(0.02, Math.min(1, anel)) * circ} ${circ}`}
            transform={`rotate(-90 ${c} ${c})`}
          />
        ) : null}
        {!escuro ? <Circle cx={c} cy={c} r={rDisco} fill={C.noite} /> : null}

        {/* brilho em volta do ovo */}
        <Ellipse cx={c} cy={cy + ry * 0.1} rx={rx * 1.08} ry={ry * 1.02} fill="#F07A12" opacity={0.18} />

        <G clipPath={`url(#clip${uid})`}>
          <Path d={ovo} fill={`url(#luz${uid})`} />
          {/* câmara de ar no topo */}
          <Ellipse cx={c} cy={cy - ry} rx={rx * 1.2} ry={camaraAr} fill="#FFD37A" opacity={0.75} />
          {/* veias */}
          {veias(ex, ey, embriaoR * 1.3, nVeias).map((d, i) => (
            <Path key={i} d={d} stroke="#9E2A0B" strokeWidth={Math.max(1, s * 0.006)} fill="none" opacity={0.55} />
          ))}
          {/* embrião */}
          <Circle cx={ex} cy={ey} r={embriaoR * 1.8} fill={`url(#emb${uid})`} opacity={0.6} />
          <Circle cx={ex} cy={ey} r={embriaoR} fill="#7A1F08" opacity={0.35 + q * 0.5} />
          {/* escurecimento: o filhote ocupa o ovo */}
          <Path d={ovo} fill="#2A0E04" opacity={escurecer} />
          {escurecer > 0 ? <Ellipse cx={c} cy={cy - ry} rx={rx * 1.2} ry={camaraAr} fill="#FFC45C" opacity={0.7} /> : null}
          {/* pontinhos da casca */}
          {[0.2, 0.45, 0.7].map((f, i) => (
            <Circle key={i} cx={c - rx * 0.5 + rx * f * 1.2} cy={cy + ry * (0.3 - f * 0.4)} r={s * 0.004} fill="#FFE1A8" opacity={0.6} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

/** Anel de progresso genérico com conteúdo no centro (usado na gestação do gado) */
export function Anel({
  p,
  tamanho = 120,
  children,
  fundo = C.primaryDark,
}: {
  p: number;
  tamanho?: number;
  children?: ReactNode;
  fundo?: string;
}) {
  const s = tamanho;
  const c = s / 2;
  const traco = s * 0.075;
  const r = c - traco / 2 - 1;
  const circ = 2 * Math.PI * r;
  const dentro = r - traco / 2 - s * 0.015;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={r} stroke={C.areia} strokeWidth={traco} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={C.ouro}
          strokeWidth={traco * 0.55}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${Math.max(0.02, Math.min(1, p)) * circ} ${circ}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
        <Circle cx={c} cy={c} r={dentro} fill={fundo} />
      </Svg>
      {children}
    </View>
  );
}
