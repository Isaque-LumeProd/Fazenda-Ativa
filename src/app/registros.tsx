import { useState } from 'react';

import { irParaRegistro, ManejoItem } from '@/components/manejo-item';
import { Button, Chips, Empty, Screen, Txt } from '@/components/ui';
import { ordenarManejos } from '@/lib/calc';
import { ORDEM_MANEJO, TIPOS_MANEJO } from '@/lib/constants';
import { useStore } from '@/lib/store';
import type { TipoManejo } from '@/lib/types';

const POR_PAGINA = 50;

export default function Registros() {
  const manejos = useStore((s) => s.manejos);
  const [filtro, setFiltro] = useState<TipoManejo | 'todos'>('todos');
  const [limite, setLimite] = useState(POR_PAGINA);

  const lista = ordenarManejos(filtro === 'todos' ? manejos : manejos.filter((m) => m.tipo === filtro));

  return (
    <Screen footer={<Button title="Registrar manejo" icon="plus" onPress={() => irParaRegistro({})} />}>
      <Chips
        options={[
          { value: 'todos' as const, label: 'Todos' },
          ...ORDEM_MANEJO.map((t) => ({ value: t, label: TIPOS_MANEJO[t].label, icon: TIPOS_MANEJO[t].icone, cor: TIPOS_MANEJO[t].cor })),
        ]}
        value={filtro}
        onChange={(v) => {
          setFiltro(v);
          setLimite(POR_PAGINA);
        }}
      />
      {lista.length === 0 ? (
        <Empty icon="clipboard-text-outline" title="Nenhum registro" text="Registre ovos, ração, água, vacinas e mais." />
      ) : (
        <>
          <Txt v="small">Toque em um registro para excluí-lo.</Txt>
          {lista.slice(0, limite).map((m) => (
            <ManejoItem key={m.id} manejo={m} />
          ))}
          {lista.length > limite && (
            <Button title="Carregar mais" variant="ghost" onPress={() => setLimite(limite + POR_PAGINA)} />
          )}
        </>
      )}
    </Screen>
  );
}
