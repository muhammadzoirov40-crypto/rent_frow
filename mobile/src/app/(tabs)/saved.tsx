import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api, getToken, type ListingItem } from '@/api';
import { C } from '@/constants/theme';
import ListingCard from '@/components/listing-card';

export default function SavedScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.favorites();
      setListings(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      load();
    }, [load]),
  );

  const authorized = !!getToken();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 40 }} color={C.accent} size="large" />
      </SafeAreaView>
    );
  }

  if (!authorized) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.title}>Избранное</Text>
        <View style={styles.authBox}>
          <View style={styles.authIcon}>
            <Ionicons name="heart-outline" size={34} color={C.accent} />
          </View>
          <Text style={styles.authText}>Войдите, чтобы сохранять понравившиеся объявления</Text>
          <Pressable style={styles.authButton} onPress={() => router.push('/auth')}>
            <Text style={styles.authButtonText}>Войти</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Избранное</Text>
      <FlatList
        data={listings}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />
        }
        ListEmptyComponent={
          <View style={styles.authBox}>
            <View style={styles.authIcon}>
              <Ionicons name="heart-outline" size={34} color={C.accent} />
            </View>
            <Text style={styles.authText}>Здесь будут ваши избранные объявления</Text>
            <Pressable style={styles.authButton} onPress={() => router.push('/(tabs)/search')}>
              <Text style={styles.authButtonText}>Найти объявления</Text>
            </Pressable>
          </View>
        }
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        renderItem={({ item }) => <ListingCard listing={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  title: {
    color: C.text,
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  authBox: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
    gap: 14,
  },
  authIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,107,53,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authText: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  authButton: {
    backgroundColor: C.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  authButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  error: {
    color: '#F87171',
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
  },
});
