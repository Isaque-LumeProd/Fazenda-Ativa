// eslint-disable-next-line no-undef
const mapa = new Map(Object.entries(globalThis.__seed?.[DEVICE] ?? {}));
export default {
  getItem: async (k) => mapa.get(k) ?? null,
  setItem: async (k, v) => {
    mapa.set(k, v);
  },
  removeItem: async (k) => {
    mapa.set(k, null);
  },
};
