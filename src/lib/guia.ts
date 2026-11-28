/**
 * Conteúdo do Guia do criador. Números de produção e peso são faixas típicas: variam com a
 * linhagem, a alimentação e o manejo.
 */

export type GrupoRaca = 'galinha' | 'pato' | 'ganso' | 'codorna' | 'peru' | 'angola' | 'faisao' | 'pavao' | 'bovinos';

export const GRUPOS_RACA: Record<GrupoRaca, { label: string; emoji: string }> = {
  galinha: { label: 'Galinha', emoji: '🐔' },
  pato: { label: 'Pato', emoji: '🦆' },
  ganso: { label: 'Ganso', emoji: '🪿' },
  codorna: { label: 'Codorna', emoji: '🐤' },
  peru: { label: 'Peru', emoji: '🦃' },
  angola: { label: 'Angola', emoji: '🐓' },
  faisao: { label: 'Faisão', emoji: '🐦' },
  pavao: { label: 'Pavão', emoji: '🦚' },
  bovinos: { label: 'Bovinos', emoji: '🐄' },
};

export type Aptidao = 'Postura' | 'Corte' | 'Dupla aptidão' | 'Ornamental' | 'Leite' | 'Guarda';

export interface Raca {
  id: string;
  nome: string;
  grupo: GrupoRaca;
  origem: string;
  aptidao: Aptidao;
  /** ovos/ano (aves) ou leite/lactação (bovinos) */
  producao?: string;
  peso: string;
  temperamento: string;
  sobre: string;
}

export const RACAS: Raca[] = [
  // ---------------------------------------------------------------- galinhas
  { id: 'caipira', nome: 'Caipira', grupo: 'galinha', origem: 'Brasil (mistura de várias raças)', aptidao: 'Dupla aptidão', producao: '80–150 ovos/ano', peso: '2–3 kg', temperamento: 'Rústica e ativa', sobre: 'A galinha do terreiro brasileiro. Resiste bem a doenças, procura o próprio alimento e costuma ser ótima choca.' },
  { id: 'canela-preta', nome: 'Canela-Preta', grupo: 'galinha', origem: 'Brasil (Piauí e Nordeste)', aptidao: 'Dupla aptidão', producao: '90–120 ovos/ano', peso: '2–2,5 kg', temperamento: 'Rústica e arisca', sobre: 'Raça nativa de penas pretas e canelas escuras. Muito adaptada ao calor e à criação solta.' },
  { id: 'pescoco-pelado', nome: 'Pescoço Pelado', grupo: 'galinha', origem: 'Leste Europeu (Transilvânia)', aptidao: 'Dupla aptidão', producao: '150–180 ovos/ano', peso: '2,5–3,5 kg', temperamento: 'Calma', sobre: 'Sem penas no pescoço, perde calor com facilidade e aguenta bem o clima quente. Muito usada em linhagens caipiras.' },
  { id: 'indio-gigante', nome: 'Índio Gigante', grupo: 'galinha', origem: 'Brasil (Minas Gerais e Goiás)', aptidao: 'Ornamental', producao: '100–150 ovos/ano', peso: 'Galo 5–8 kg', temperamento: 'Dócil', sobre: 'Ave alta e pesada, criada pelo porte. Cresce devagar e precisa de espaço e ração de boa qualidade.' },
  { id: 'embrapa-051', nome: 'Embrapa 051', grupo: 'galinha', origem: 'Brasil (Embrapa Suínos e Aves)', aptidao: 'Postura', producao: '300+ ovos/ano', peso: '2–2,5 kg', temperamento: 'Calma', sobre: 'Linhagem colonial para postura de ovos marrons, feita para criação semi-intensiva no pequeno produtor.' },
  { id: 'label-rouge', nome: 'Pesadão (Label Rouge)', grupo: 'galinha', origem: 'França (linhagens de frango caipira)', aptidao: 'Corte', producao: '150–180 ovos/ano', peso: '3–4 kg', temperamento: 'Calma', sobre: 'Frango de crescimento mais lento que o de granja, com carne firme. Base de muitas criações de frango caipira.' },
  { id: 'rhode-island', nome: 'Rhode Island Red', grupo: 'galinha', origem: 'Estados Unidos', aptidao: 'Dupla aptidão', producao: '200–280 ovos/ano', peso: '2,9–3,9 kg', temperamento: 'Resistente', sobre: 'Penas vermelho-escuras e ovos marrons. Boa poedeira e resistente ao frio e ao calor.' },
  { id: 'plymouth', nome: 'Plymouth Rock Barrada', grupo: 'galinha', origem: 'Estados Unidos', aptidao: 'Dupla aptidão', producao: '200–250 ovos/ano', peso: '3–4 kg', temperamento: 'Dócil', sobre: 'A conhecida "carijó". Boa de ovo e de carne, tranquila e fácil de manejar.' },
  { id: 'leghorn', nome: 'Leghorn', grupo: 'galinha', origem: 'Itália', aptidao: 'Postura', producao: '250–300 ovos/ano', peso: '1,8–2,4 kg', temperamento: 'Agitada', sobre: 'Base das poedeiras de ovos brancos. Come pouco e põe muito, mas quase nunca choca.' },
  { id: 'australorp', nome: 'Australorp', grupo: 'galinha', origem: 'Austrália', aptidao: 'Dupla aptidão', producao: '250–300 ovos/ano', peso: '3–3,8 kg', temperamento: 'Muito calma', sobre: 'Penas pretas com brilho verde. Excelente poedeira de ovos marrons e boa para quem está começando.' },
  { id: 'orpington', nome: 'Orpington', grupo: 'galinha', origem: 'Inglaterra', aptidao: 'Dupla aptidão', producao: '150–200 ovos/ano', peso: '3,5–4,5 kg', temperamento: 'Dócil', sobre: 'Ave grande e fofa, muito mansa e boa choca. A variedade amarela (Buff) é a mais comum.' },
  { id: 'sussex', nome: 'Sussex', grupo: 'galinha', origem: 'Inglaterra', aptidao: 'Dupla aptidão', producao: '200–250 ovos/ano', peso: '3–4 kg', temperamento: 'Calma e curiosa', sobre: 'A variedade "Light" (branca com pescoço preto) é a mais conhecida. Boa produção o ano todo.' },
  { id: 'brahma', nome: 'Brahma', grupo: 'galinha', origem: 'Ásia / Estados Unidos', aptidao: 'Ornamental', producao: '100–150 ovos/ano', peso: '4–5,5 kg', temperamento: 'Muito dócil', sobre: 'Gigante de pés emplumados. Aguenta bem o frio; no calor precisa de sombra e água fresca.' },
  { id: 'cochin', nome: 'Cochin', grupo: 'galinha', origem: 'China', aptidao: 'Ornamental', producao: '100–150 ovos/ano', peso: '4–5 kg', temperamento: 'Calma', sobre: 'Muitas penas, inclusive nos pés. Choca com facilidade e é ótima mãe.' },
  { id: 'sedosa', nome: 'Sedosa (Silkie)', grupo: 'galinha', origem: 'China', aptidao: 'Ornamental', producao: '100–120 ovos/ano', peso: '1–1,5 kg', temperamento: 'Muito dócil', sobre: 'Penas que parecem pelo e pele escura. Uma das melhores chocas: aceita até ovos de outras aves.' },
  { id: 'garnise', nome: 'Garnisé', grupo: 'galinha', origem: 'Ásia', aptidao: 'Ornamental', producao: '50–100 ovos/ano', peso: '0,5–1 kg', temperamento: 'Ativa', sobre: 'Galinha miniatura. Ótima choca e mãe, ocupa pouco espaço.' },
  { id: 'new-hampshire', nome: 'New Hampshire', grupo: 'galinha', origem: 'Estados Unidos', aptidao: 'Dupla aptidão', producao: '200–250 ovos/ano', peso: '3–3,8 kg', temperamento: 'Calma', sobre: 'Derivada da Rhode Island, cresce mais rápido e empluma cedo. Boa para carne e ovos.' },
  { id: 'jersey-negro', nome: 'Gigante Negro de Jersey', grupo: 'galinha', origem: 'Estados Unidos', aptidao: 'Corte', producao: '150–200 ovos/ano', peso: '4,5–5,5 kg', temperamento: 'Calma', sobre: 'Uma das maiores raças de galinha. Cresce devagar, mas chega a bom peso.' },
  { id: 'paraiso-pedres', nome: 'Paraíso Pedrês', grupo: 'galinha', origem: 'Brasil', aptidao: 'Dupla aptidão', producao: '150–200 ovos/ano', peso: '3–4 kg', temperamento: 'Rústica', sobre: 'Linhagem caipira melhorada, de penas carijós. Criada solta para carne e ovos.' },
  { id: 'polonesa', nome: 'Polonesa', grupo: 'galinha', origem: 'Europa', aptidao: 'Ornamental', producao: '100–150 ovos/ano', peso: '2–2,7 kg', temperamento: 'Curiosa', sobre: 'Topete grande que cobre os olhos. Precisa de abrigo da chuva e cuidado com bicadas.' },
  // ---------------------------------------------------------------- patos e marrecos
  { id: 'pequim', nome: 'Pequim', grupo: 'pato', origem: 'China', aptidao: 'Corte', producao: '150–200 ovos/ano', peso: '3,5–4,5 kg', temperamento: 'Calmo', sobre: 'Pato branco de crescimento rápido, o mais criado para carne no mundo.' },
  { id: 'corredor', nome: 'Corredor Indiano', grupo: 'pato', origem: 'Indonésia', aptidao: 'Postura', producao: '200–300 ovos/ano', peso: '1,5–2 kg', temperamento: 'Ativo', sobre: 'Anda em pé, quase vertical. Ótimo poedeiro e ajuda a controlar lesmas e insetos na horta.' },
  { id: 'rouen', nome: 'Rouen', grupo: 'pato', origem: 'França', aptidao: 'Corte', producao: '50–100 ovos/ano', peso: '4–5 kg', temperamento: 'Calmo', sobre: 'Parece um marreco selvagem grande. Cresce devagar e dá carne de qualidade.' },
  { id: 'khaki', nome: 'Khaki Campbell', grupo: 'pato', origem: 'Inglaterra', aptidao: 'Postura', producao: '250–300 ovos/ano', peso: '2–2,5 kg', temperamento: 'Ativo', sobre: 'Um dos patos que mais põem ovos. Rústico e bom forrageador.' },
  { id: 'crioulo', nome: 'Pato Crioulo', grupo: 'pato', origem: 'América do Sul', aptidao: 'Corte', producao: '60–120 ovos/ano', peso: 'Macho 4–6 kg', temperamento: 'Silencioso', sobre: 'O "pato do mato" doméstico. Incubação de 35 dias, choca muito bem e quase não faz barulho.' },
  { id: 'mandarim', nome: 'Marreco Mandarim', grupo: 'pato', origem: 'China', aptidao: 'Ornamental', producao: '9–12 ovos/postura', peso: '0,4–0,7 kg', temperamento: 'Arisco', sobre: 'Marreco pequeno de cores fortes. Precisa de lago e de viveiro fechado, pois voa.' },
  // ---------------------------------------------------------------- gansos
  { id: 'sinaleiro', nome: 'Ganso Sinaleiro (Chinês)', grupo: 'ganso', origem: 'China', aptidao: 'Guarda', producao: '40–60 ovos/ano', peso: '4–5 kg', temperamento: 'Barulhento', sobre: 'Avisa qualquer movimento estranho: é um ótimo "vigia" da propriedade.' },
  { id: 'toulouse', nome: 'Ganso Toulouse', grupo: 'ganso', origem: 'França', aptidao: 'Corte', producao: '20–40 ovos/ano', peso: '8–9 kg', temperamento: 'Calmo', sobre: 'Ganso cinza e pesado, tranquilo. Criado para carne.' },
  { id: 'africano', nome: 'Ganso Africano', grupo: 'ganso', origem: 'Ásia (apesar do nome)', aptidao: 'Corte', producao: '20–40 ovos/ano', peso: '8–10 kg', temperamento: 'Calmo', sobre: 'Tem uma bolsa sob o bico e um calo na testa. Grande e de vida longa.' },
  // ---------------------------------------------------------------- codornas
  { id: 'codorna-japonesa', nome: 'Codorna Japonesa', grupo: 'codorna', origem: 'Japão', aptidao: 'Postura', producao: '250–300 ovos/ano', peso: '120–150 g', temperamento: 'Agitada', sobre: 'Começa a pôr com 6 a 7 semanas. É a codorna dos ovos vendidos no mercado.' },
  { id: 'codorna-europeia', nome: 'Codorna Europeia', grupo: 'codorna', origem: 'Europa', aptidao: 'Corte', producao: '150–200 ovos/ano', peso: '200–300 g', temperamento: 'Agitada', sobre: 'Maior que a japonesa, criada principalmente para carne.' },
  // ---------------------------------------------------------------- outras aves
  { id: 'peru-bronze', nome: 'Peru Bronze', grupo: 'peru', origem: 'América do Norte', aptidao: 'Corte', producao: '50–100 ovos/ano', peso: 'Macho 12–15 kg', temperamento: 'Curioso', sobre: 'Penas bronzeadas com brilho metálico. Os filhotes são sensíveis ao frio e à umidade.' },
  { id: 'angola', nome: "Galinha d'Angola", grupo: 'angola', origem: 'África', aptidao: 'Dupla aptidão', producao: '80–100 ovos/ano', peso: '1,5–2 kg', temperamento: 'Barulhenta', sobre: 'Come carrapatos e insetos e dá alarme quando vê estranhos. Prefere viver em bando e solta.' },
  { id: 'faisao-coleira', nome: 'Faisão de Coleira', grupo: 'faisao', origem: 'Ásia', aptidao: 'Ornamental', producao: '40–60 ovos/ano', peso: '1–1,5 kg', temperamento: 'Arisco', sobre: 'O macho tem um anel branco no pescoço. Precisa de viveiro alto e fechado.' },
  { id: 'pavao-azul', nome: 'Pavão Azul', grupo: 'pavao', origem: 'Índia', aptidao: 'Ornamental', producao: '20–30 ovos/ano', peso: '4–6 kg', temperamento: 'Arisco', sobre: 'Só os machos têm a cauda grande, que cresce a partir do 3º ano. Vive mais de 20 anos.' },
  // ---------------------------------------------------------------- bovinos
  { id: 'nelore', nome: 'Nelore', grupo: 'bovinos', origem: 'Índia (raça Ongole) / Brasil', aptidao: 'Corte', peso: 'Vaca 450–550 kg · touro 800–1.000 kg', temperamento: 'Ativo', sobre: 'Zebuíno branco, base do rebanho de corte brasileiro. Rústico, resiste ao calor e ao carrapato e aproveita bem o pasto.' },
  { id: 'angus', nome: 'Angus', grupo: 'bovinos', origem: 'Escócia', aptidao: 'Corte', peso: 'Vaca 500–600 kg · touro 850–1.000 kg', temperamento: 'Dócil', sobre: 'Taurino sem chifres, preto ou vermelho. Precoce e com carne marmorizada; muito usado em cruzamento com Nelore.' },
  { id: 'brahman', nome: 'Brahman', grupo: 'bovinos', origem: 'Estados Unidos', aptidao: 'Corte', peso: 'Vaca 450–650 kg · touro 800–1.100 kg', temperamento: 'Ativo', sobre: 'Zebuíno formado nos EUA, rústico e de boa musculatura. Usado para dar vigor em cruzamentos.' },
  { id: 'senepol', nome: 'Senepol', grupo: 'bovinos', origem: 'Ilhas Virgens (Caribe)', aptidao: 'Corte', peso: 'Vaca 500–600 kg · touro 800–1.000 kg', temperamento: 'Dócil', sobre: 'Taurino adaptado ao calor, de pelo curto e vermelho, sem chifres. Bom para cruzamento industrial.' },
  { id: 'tabapua', nome: 'Tabapuã', grupo: 'bovinos', origem: 'Brasil (São Paulo)', aptidao: 'Corte', peso: 'Vaca 450–550 kg · touro 800–950 kg', temperamento: 'Dócil', sobre: 'Zebuíno brasileiro sem chifres, precoce e fácil de manejar.' },
  { id: 'guzera', nome: 'Guzerá', grupo: 'bovinos', origem: 'Índia', aptidao: 'Dupla aptidão', producao: '2.000–3.500 L/lactação', peso: 'Vaca 450–550 kg · touro 750–1.000 kg', temperamento: 'Rústico', sobre: 'Zebuíno de chifres em lira, muito resistente à seca. Serve para carne e leite.' },
  { id: 'gir', nome: 'Gir Leiteiro', grupo: 'bovinos', origem: 'Índia', aptidao: 'Leite', producao: '2.500–4.000 L/lactação', peso: 'Vaca 400–450 kg · touro 650–800 kg', temperamento: 'Dócil', sobre: 'Zebuíno de testa larga e orelhas compridas. Base do Girolando e muito adaptado ao clima tropical.' },
  { id: 'girolando', nome: 'Girolando', grupo: 'bovinos', origem: 'Brasil (Gir × Holandês)', aptidao: 'Leite', producao: '4.000–6.000 L/lactação', peso: 'Vaca 450–550 kg', temperamento: 'Dócil', sobre: 'Junta a rusticidade do Gir com a produção da Holandesa. Responde pela maior parte do leite do Brasil.' },
  { id: 'holandesa', nome: 'Holandesa', grupo: 'bovinos', origem: 'Holanda', aptidao: 'Leite', producao: '8.000–10.000+ L/lactação', peso: 'Vaca 550–650 kg', temperamento: 'Dócil', sobre: 'A maior produtora de leite. Exige boa comida, sombra e conforto: sofre com o calor.' },
  { id: 'jersey', nome: 'Jersey', grupo: 'bovinos', origem: 'Ilha de Jersey (Reino Unido)', aptidao: 'Leite', producao: '4.000–6.000 L/lactação', peso: 'Vaca 350–450 kg', temperamento: 'Dócil', sobre: 'Vaca pequena com leite rico em gordura e proteína, ótimo para queijo. Come menos que a Holandesa.' },
  { id: 'simental', nome: 'Simental', grupo: 'bovinos', origem: 'Suíça', aptidao: 'Dupla aptidão', producao: '4.000–6.000 L/lactação', peso: 'Vaca 600–750 kg · touro 1.000–1.300 kg', temperamento: 'Dócil', sobre: 'Taurino grande, de cara branca. Cresce rápido e também dá bom leite.' },
  { id: 'canchim', nome: 'Canchim', grupo: 'bovinos', origem: 'Brasil (Embrapa)', aptidao: 'Corte', peso: 'Vaca 500–600 kg · touro 850–1.000 kg', temperamento: 'Dócil', sobre: 'Formado por 5/8 Charolês e 3/8 zebu. Ganha peso rápido e é adaptado ao Brasil Central.' },
  { id: 'brangus', nome: 'Brangus', grupo: 'bovinos', origem: 'Estados Unidos (Angus × Brahman)', aptidao: 'Corte', peso: 'Vaca 500–600 kg · touro 850–1.000 kg', temperamento: 'Dócil', sobre: 'Preto e sem chifres, une a carne do Angus à rusticidade do Brahman.' },
  { id: 'sindi', nome: 'Sindi', grupo: 'bovinos', origem: 'Paquistão', aptidao: 'Dupla aptidão', producao: '1.500–2.500 L/lactação', peso: 'Vaca 300–350 kg', temperamento: 'Dócil', sobre: 'Zebuíno pequeno e vermelho, muito resistente à seca. Boa opção para o semiárido.' },
  { id: 'curraleiro', nome: 'Curraleiro Pé-Duro', grupo: 'bovinos', origem: 'Brasil (Nordeste)', aptidao: 'Dupla aptidão', peso: 'Vaca 250–350 kg', temperamento: 'Rústico', sobre: 'Raça nativa trazida pelos colonizadores. Extremamente rústica, vive bem com pouca comida.' },
  { id: 'mestico', nome: 'Mestiço / Cruzado', grupo: 'bovinos', origem: 'Vários', aptidao: 'Dupla aptidão', peso: 'Varia', temperamento: 'Varia', sobre: 'Animais de cruzamento sem raça definida. O vigor híbrido costuma trazer boa rusticidade e ganho de peso.' },
];

export const RACAS_BOVINAS = RACAS.filter((r) => r.grupo === 'bovinos').map((r) => (r.id === 'gir' ? 'Gir' : r.nome));

// ---------------------------------------------------------------- cuidados com filhotes

export const CUIDADOS_PINTINHOS: { titulo: string; passos: string[] }[] = [
  {
    titulo: 'Primeiras 24 horas',
    passos: [
      'Deixe os pintinhos na chocadeira até secarem e ficarem fofos (até 24 horas).',
      'Eles ainda têm a reserva da gema: não precisam comer logo que nascem.',
      'Prepare a pinteira antes: cama de maravalha, fonte de calor, água e ração inicial.',
    ],
  },
  {
    titulo: 'Calor (pinteira)',
    passos: [
      'Na 1ª semana, cerca de 32–35 °C embaixo da lâmpada; baixe uns 3 °C por semana.',
      'Pintinhos amontoados embaixo da luz: estão com frio. Afastados e de bico aberto: calor demais.',
      'Espalhados e piando baixinho: a temperatura está certa.',
    ],
  },
  {
    titulo: 'Água e ração',
    passos: [
      'Use bebedouro raso ou ponha pedrinhas para que não se afoguem.',
      'Mostre a água molhando o bico de alguns pintinhos.',
      'Ração inicial (farelada ou triturada) à vontade nas primeiras semanas.',
    ],
  },
  {
    titulo: 'Saúde',
    passos: [
      'Siga o calendário de vacinas da sua região (Marek e Newcastle são as mais comuns).',
      'Troque a cama molhada e mantenha o lugar sem correntes de vento.',
      'Fezes grudadas no bumbum: limpe com água morna, pode ser sinal de frio.',
    ],
  },
];

export const CUIDADOS_BEZERROS: { titulo: string; passos: string[] }[] = [
  {
    titulo: 'Logo após o parto',
    passos: [
      'Veja se o bezerro respira bem e se a vaca o lambe e o aceita.',
      'Cure o umbigo com iodo a 10%, por 3 dias seguidos.',
      'Pese e identifique (brinco) nos primeiros dias.',
    ],
  },
  {
    titulo: 'Colostro',
    passos: [
      'O bezerro deve mamar o colostro nas primeiras 6 horas de vida.',
      'O colostro é a "vacina" natural: sem ele o bezerro adoece com facilidade.',
      'Se ele não conseguir mamar, ordenhe a vaca e dê na mamadeira.',
    ],
  },
  {
    titulo: 'Primeiros meses',
    passos: [
      'Água limpa e sal mineral à vontade; ofereça capim novo e concentrado para estimular o rúmen.',
      'Fique de olho em diarreia e tristeza parasitária (febre e fraqueza).',
      'Siga o calendário sanitário: clostridioses, brucelose para fêmeas de 3 a 8 meses e aftosa conforme a sua região.',
    ],
  },
];
