import { useState } from 'react';

import { Card, Passos, Screen, Section, Segmented } from '@/components/ui';
import { CUIDADOS_BEZERROS, CUIDADOS_PINTINHOS } from '@/lib/guia';

export default function Filhotes() {
  const [aba, setAba] = useState<'aves' | 'bezerros'>('aves');
  const lista = aba === 'aves' ? CUIDADOS_PINTINHOS : CUIDADOS_BEZERROS;
  return (
    <Screen>
      <Segmented
        value={aba}
        onChange={setAba}
        options={[
          { value: 'aves', label: 'Pintinhos' },
          { value: 'bezerros', label: 'Bezerros' },
        ]}
      />
      {lista.map((c) => (
        <Section key={c.titulo} title={c.titulo}>
          <Card>
            <Passos itens={c.passos} />
          </Card>
        </Section>
      ))}
    </Screen>
  );
}
