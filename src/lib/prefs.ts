/**
 * Preferências deste aparelho (não vão para a nuvem): nome de quem usa e quais lembretes tocar.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Lembretes {
  viragem: boolean;
  umidade: boolean;
  ovoscopia: boolean;
  faseFinal: boolean;
  nascimento: boolean;
  tarefas: boolean;
  gado: boolean;
}

export const LEMBRETES_PADRAO: Lembretes = {
  viragem: true,
  umidade: true,
  ovoscopia: true,
  faseFinal: true,
  nascimento: true,
  tarefas: true,
  gado: true,
};

interface Prefs {
  nome: string;
  /** o usuário já tocou em "Ativar lembretes" */
  lembretesAtivos: boolean;
  lembretes: Lembretes;
  definir: (p: Partial<Omit<Prefs, 'definir'>>) => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      nome: '',
      lembretesAtivos: false,
      lembretes: LEMBRETES_PADRAO,
      definir: (p) => set(p),
    }),
    {
      name: 'fazenda-ativa:prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ nome, lembretesAtivos, lembretes }) => ({ nome, lembretesAtivos, lembretes }),
      merge: (salvo, atual) => {
        const s = (salvo ?? {}) as Partial<Prefs>;
        return { ...atual, ...s, lembretes: { ...LEMBRETES_PADRAO, ...s.lembretes } };
      },
    },
  ),
);
