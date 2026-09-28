import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api, getToken, type ListingItem } from '@/api';
import { C } from '@/constants/theme';
import { formatPrice } from '@/components/listing-card';

type FullListing = ListingItem & { description?: string | null };

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<FullListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listing(Number(id));
      setListing(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Объявление не найдено');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleFavorite = async () => {
    if (!listing) return;
    if (!getToken()) {
      router.push('/auth');
      return;
    }
    try {
      const res = await api.toggleFavorite(listing.id);
      setListing({ ...listing, is_favorited: res.data?.is_favorited ?? false });
    } catch {}
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={C.textSecondary} />
        <Text style={styles.errorText}>{error || 'Объявление не найдено'}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: listing.title }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {listing.primary_image ? (
          <Image source={{ uri: listing.primary_image }} style={styles.hero} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Ionicons name="home-outline" size={48} color={C.textSecondary} />
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.price}>{formatPrice(listing)}</Text>
            <Pressable style={styles.favBtn} onPress={toggleFavorite} hitSlop={8}>
              <Ionicons
                name={listing.is_favorited ? 'heart' : 'heart-outline'}
                size={22}
                color={listing.is_favorited ? C.accent : C.textSecondary}
              />
            </Pressable>
          </View>

          <Text style={styles.title}>{listing.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={C.textSecondary} />
            <Text style={styles.meta}>
              {listing.city_name || '—'}
              {listing.district_name ? `, ${listing.district_name}` : ''}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={15} color={C.accent} />
            <Text style={styles.meta}>
              {listing.average_rating ? listing.average_rating.toFixed(1) : 'Нет оценок'}
            </Text>
            <Text style={styles.meta}>· {listing.views_count ?? 0} просмотров</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Описание</Text>
          <Text style={styles.description}>
            {listing.description || 'Описание отсутствует.'}
          </Text>

          <View style={styles.divider} />

          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={() => (getToken() ? null : router.push('/auth'))}>
              <Ionicons name="calendar-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Забронировать</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => (getToken() ? null : router.push('/auth'))}>
              <Ionicons name="chatbubble-outline" size={18} color={C.text} />
              <Text style={styles.secondaryBtnText}>Написать</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  center: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  hero: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: C.backgroundElement,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    color: C.accent,
    fontSize: 26,
    fontWeight: '800',
  },
  favBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: C.backgroundElement,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: C.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    color: C.textSecondary,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  description: {
    color: C.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.backgroundElement,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    borderRadius: 16,
  },
  secondaryBtnText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
