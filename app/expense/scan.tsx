import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton, LoadingOverlay, PrimaryButton, Screen } from '../../components/ui';
import { theme } from '../../constants/theme';
import { useApp } from '../../context/AppProvider';
import { analyzeReceipt } from '../../services/aiService';
import { ExpenseDraft } from '../../types';
import { normalizeExpenseCategory } from '../../utils/expense';

export default function ScanExpenseScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const router = useRouter();
  const { groups, setPendingDraft } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [loading, setLoading] = useState(false);

  const groupsExist = groups.length > 0;

  const prepareImage = async (uri: string) =>
    ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

  const processUri = async (uri: string) => {
    try {
      setLoading(true);
      const manipulated = await prepareImage(uri);

      if (!manipulated.base64) {
        throw new Error('No se pudo preparar la imagen del ticket.');
      }

      const extracted = await analyzeReceipt(manipulated.base64);
      const draft: ExpenseDraft = {
        amount: extracted.total ?? 0,
        currency: extracted.currency || 'ARS',
        description: extracted.merchant || 'Gasto de ticket',
        date: extracted.date || new Date().toISOString(),
        merchant: extracted.merchant,
        items: extracted.items ?? [],
        receiptImageUri: manipulated.uri,
        source: 'camera',
        groupId,
        splitMode: 'equal',
        selectedMemberIds: [],
        category: normalizeExpenseCategory(extracted.category),
      };

      setPendingDraft(draft);
      router.push('/expense/confirm');
    } catch (error) {
      Alert.alert(
        'Falló el escaneo del ticket',
        error instanceof Error ? error.message : 'Por favor, probá con otra imagen.'
      );
    } finally {
      setLoading(false);
    }
  };

  const takePicture = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!cameraRef.current) {
      return;
    }

    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (result?.uri) {
        await processUri(result.uri);
      }
    } catch (error) {
      Alert.alert('Error de cámara', 'No se pudo capturar la foto en este momento.');
    }
  };

  const pickImage = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await processUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error al seleccionar foto', 'No se pudo abrir tu fototeca.');
    }
  };

  if (!groupsExist) {
    return (
      <Screen includeTopInset contentContainerStyle={styles.emptyScreen}>
        <Text style={styles.title}>Creá un grupo primero</Text>
        <Text style={styles.subtitle}>
          Para escanear un ticket, el gasto necesita un grupo donde guardarse.
        </Text>
        <PrimaryButton label="Ir a Grupos" onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.replace('/');
        }} />
      </Screen>
    );
  }

  if (!permission?.granted) {
    return (
      <Screen includeTopInset contentContainerStyle={styles.permissionScreen}>
        <Text style={styles.title}>Se necesita acceso a la cámara</Text>
        <Text style={styles.subtitle}>
          SplitSnap usa la cámara para capturar tickets en el momento.
        </Text>
        <PrimaryButton label="Permitir Cámara" onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          void requestPermission();
        }} />
        <GhostButton
          label="Elegir de la Galería"
          onPress={() => void pickImage()}
        />
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <View style={styles.overlayTop}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.iconButton}
        >
          <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
      </View>

      <View style={styles.bottomPanel}>
        <Text style={styles.cameraTitle}>Escaneá tu ticket</Text>
        <Text style={styles.cameraCopy}>
          Mantené el ticket completo dentro del cuadro para una mejor extracción.
        </Text>

        <View style={styles.actionRow}>
          <Pressable onPress={() => void pickImage()} style={styles.secondaryAction}>
            <Ionicons color={theme.colors.textPrimary} name="images-outline" size={22} />
            <Text style={styles.secondaryLabel}>Galería</Text>
          </Pressable>

          <Pressable onPress={() => void takePicture()} style={styles.captureButton}>
            <View style={styles.captureInner} />
          </Pressable>

          <View style={styles.secondaryActionPlaceholder} />
        </View>
      </View>

      {loading ? <LoadingOverlay label="Leyendo tu ticket..." /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
  },
  iconButton: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 36,
    gap: theme.spacing.md,
    backgroundColor: 'rgba(10, 10, 10, 0.28)',
  },
  cameraTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  cameraCopy: {
    color: '#E5E5E5',
    fontSize: 15,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryAction: {
    width: 88,
    alignItems: 'center',
    gap: 6,
  },
  secondaryActionPlaceholder: {
    width: 88,
  },
  secondaryLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  captureButton: {
    height: 82,
    width: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: theme.colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    height: 62,
    width: 62,
    borderRadius: 31,
    backgroundColor: theme.colors.textPrimary,
  },
  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  emptyScreen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
