import { StyleSheet, Text } from 'react-native';

import { AppCard, Screen, SectionTitle } from '../components/ui';
import { theme } from '../constants/theme';

export default function SettingsScreen() {
  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <SectionTitle
        title="Configuración"
        subtitle="Preferencias básicas de la app y opciones que vamos a seguir ampliando."
      />

      <AppCard>
        <Text style={styles.label}>Tema</Text>
        <Text style={styles.value}>Nómada Digital + Sage</Text>
      </AppCard>

      <AppCard>
        <Text style={styles.label}>Sincronización</Text>
        <Text style={styles.value}>Tus datos se guardan sólo en este dispositivo por ahora.</Text>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
  },
  label: {
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    ...theme.typography.caption,
    fontWeight: '500',
  },
  value: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
  },
});
