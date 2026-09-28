import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api, type City, type ListingItem } from '@/api';
import { C } from '@/constants/theme';
import ListingCard from '@/components/listing-card';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; category_id?: string }>();
  const router = useRouter();

  const [query, setQuery] = useState(params.q ?? '');
  const [cityId, setCityId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>(params.category_id ?? '');
  const [cities, setCities] = useState<City[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.cities().then((res) => setCities(res.data ?? [])).catch(() => setCities([]));
  }, []);

  const load = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listings({
          q: query.trim() || undefined,
          city_id: cityId || undefined,
          category_id: categoryId || undefined,
          page: nextPage,
          page_size: 20,
        });
        setTotal(res.total ?? 0);
        setPage(res.page ?? nextPage);
        setListings((prev) => (nextPage === 1 ? res.data ?? [] : [...prev, ...(res.data ?? [])]));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка поиска');
      } finally {
        setLoading(false);
      }
    },
    [query, cityId, categoryId],
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={C.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск объяввлений…"
          placeholderTextColor={C.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={C.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Pressable
          style={[styles.chip, !cityId && styles.chipActive]}
          onPress={() => setCityId('')}>
          <Text style={[styles.chipText, !cityId && styles.chipTextActive]}>Все города</Text>
        </Pressable>
        {cities.map((city) => (
          <Pressable
            key={city.id}
            style={[styles.chip, cityId === String(city.id) && styles.chipActive]}
            onPress={() => setCityId(cityId === String(city.id) ? '' : String(city.id))}>
            <Text style={[styles.chipText, cityId === String(city.id) && styles.chipTextActive]}>
              {city.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.counter}>{loading ? '…' : `Найдено: ${total}`}</Text>

      {loading && listings.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.accent} size="large" />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.list}
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={!loading ? <Text style={styles.empty}>Ничего не найдено</Text> : null}
          ListFooterComponent={
            listings.length < total ? (
              <Pressable style={styles.more} onPress={() => load(page + 1)}>
                <Text style={styles.moreText}>Показать ещё</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => <ListingCard listing={item} />}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 10,
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
  chipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  chipText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  counter: {
    color: C.textSecondary,
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
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
  more: {
    marginHorizontal: 40,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.backgroundElement,
    borderWidth: 1,
    borderColor: C.accent,
    alignItems: 'center',
  },
  moreText: {
    color: C.accent,
    fontWeight: '700',
    fontSize: 14,
  },
});
