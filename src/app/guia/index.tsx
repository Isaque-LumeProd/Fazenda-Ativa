import { router } from 'expo-router';
import { View } from 'react-native';

import { Grupo, Linha, Screen, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { IMPREVISTOS } from '@/lib/chocada';
import { RACAS } from '@/lib/guia';

export default function Guia() {
  return (
    <Screen>
      <Txt v="muted">Tudo o que você precisa para chocar, criar os filhotes e escolher as raças.</Txt>
      <View style={{ gap: S.md }}>
        <Grupo>
          <Linha primeira icon="egg-outline" iconColor={C.ouro} title="Incubação por espécie" subtitle="Dias, temperatura, umidade e ovoscopia" onPress={() => router.push('/guia/incubacao')} />
          <Linha icon="book-open-variant" iconColor={C.ouro} title={`Raças (${RACAS.length})`} subtitle="Aves e bovinos: origem, peso, produção" onPress={() => router.push('/guia/racas')} />
          <Linha icon="baby-face-outline" iconColor={C.ouro} title="Cuidados com os filhotes" subtitle="Pintinhos e bezerros recém-nascidos" onPress={() => router.push('/guia/pintinhos')} />
          <Linha icon="lightning-bolt-outline" iconColor={C.warning} title="Imprevistos na chocadeira" subtitle={`${IMPREVISTOS.length} situações com o passo a passo`} onPress={() => router.push('/guia/incubacao')} />
        </Grupo>
      </View>
    </Screen>
  );
}
