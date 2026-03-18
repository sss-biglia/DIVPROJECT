import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { theme } from '../constants/theme';
import { useApp } from '../context/AppProvider';
import { formatARS, formatUSD } from '../services/dolarService';

export default function ReceiptViewerScreen() {
  const router = useRouter();
  const { groupId, expenseId } = useLocalSearchParams<{ groupId?: string; expenseId?: string }>();
  const { groups } = useApp();

  const group = groups.find((entry) => entry.id === groupId);
  const expense = group?.expenses.find((entry) => entry.id === expenseId);
  const receiptUri = expense?.receiptImageUri;

  if (!group || !receiptUri || !expense) {
    return (
      <View style={styles.missingWrap}>
        <Text style={styles.missingText}>No encontramos ese comprobante.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
        <Pressable
          onPress={() =>
            void Share.share({
              message: receiptUri,
              url: receiptUri,
            })
          }
          style={styles.iconButton}
        >
          <Ionicons color={theme.colors.textPrimary} name="share-outline" size={20} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.viewer}
        contentContainerStyle={styles.viewerContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        centerContent
      >
        <Image source={{ uri: receiptUri }} style={styles.image} contentFit="contain" />
      </ScrollView>

      <View style={styles.bottomOverlay}>
        <Text style={styles.expenseTitle}>{expense.description}</Text>
        <Text style={styles.expenseMeta}>
          {expense.currency === 'USD' ? formatUSD(expense.amount) : formatARS(expense.amount)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,18,18,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  viewer: {
    flex: 1,
  },
  viewerContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: 'rgba(0,0,0,0.8)',
    gap: 4,
  },
  expenseTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.headline,
  },
  expenseMeta: {
    color: theme.colors.textSecondary,
    ...theme.typography.footnote,
  },
  missingWrap: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    color: theme.colors.textPrimary,
    ...theme.typography.callout,
  },
});
