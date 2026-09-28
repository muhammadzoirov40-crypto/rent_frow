import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { api, type Category, type ListingItem } from '@/api';
import { C } from '@/constants/theme';
import ListingCard from '@/components/listing-card';

export default function HomeScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [listingsRes, categoriesRes] = await Promise.all([
        api.listings({ page_size: 12 }),
        api.categories().catch(() => ({ data: [] as Category[], total: 0, page: 1, page_size: 0 })),
      ]);
      setListings(listingsRes.data ?? []);
      setCategories(categoriesRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const toggleFavorite = async (listing: ListingItem) => {
    try {
      const res = await api.toggleFavorite(listing.id);
      const next = res.data?.is_favorited ?? false;
      setListings((prev) =>
        prev.map((item) => (item.id === listing.id ? { ...item, is_favorited: next } : item)),
      );
    } catch {
      router.push('/auth');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>R</Text>
          </View>
          <Text style={styles.logoText}>RentHub</Text>
        </View>
        <Pressable style={styles.bell} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-outline" size={20} color={C.text} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={C.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Что хотите арендовать?"
          placeholderTextColor={C.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => router.push({ pathname: '/(tabs)/search', params: { q: query } })}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.accent} size="large" />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          ListHeaderComponent={
            <View>
              <Text style={styles.sectionTitle}>Категории</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={styles.chip}
                    onPress={() =>
                      router.push({ pathname: '/(tabs)/search', params: { category_id: String(cat.id) } })
                    }>
                    <Text style={styles.chipText}>{cat.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>Новые объявления</Text>
              {error && <Text style={styles.error}>{error}</Text>}
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>Объявлений пока нет</Text>}
          renderItem={({ item }) => <ListingCard listing={item} onToggleFavorite={toggleFavorite} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  logoText: {
    color: C.accent,
    fontSize: 20,
    fontWeight: '800',
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: C.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 16,
    backgroundColor: C.backgroundElement,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  chips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.backgroundElement,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  empty: {
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 30,
  },
  error: {
    color: '#F87171',
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
  },
});
