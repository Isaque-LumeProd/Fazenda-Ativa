import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';

import { SyncIcone } from '@/components/sync-status';
import { Icon } from '@/components/ui';
import { C } from '@/constants/theme';
import type { IconName } from '@/lib/constants';

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: unknown }) {
    return <Icon name={name} color={String(color)} size={24} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        headerTitleStyle: { color: C.text },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerTitle: 'Fazenda Ativa',
          tabBarIcon: tabIcon('home-variant'),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8 }}>
              <SyncIcone />
              <Pressable
                onPress={() => router.push('/config')}
                style={{ paddingHorizontal: 8 }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Configurações">
                <Icon name="cog" color={C.muted} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="galinheiros" options={{ title: 'Galinheiros', tabBarIcon: tabIcon('barn') }} />
      <Tabs.Screen name="manejo" options={{ title: 'Registros', tabBarIcon: tabIcon('clipboard-text-outline') }} />
      <Tabs.Screen name="estoque" options={{ title: 'Estoque', tabBarIcon: tabIcon('package-variant') }} />
      <Tabs.Screen name="tarefas" options={{ title: 'Tarefas', tabBarIcon: tabIcon('calendar-check') }} />
    </Tabs>
  );
}
