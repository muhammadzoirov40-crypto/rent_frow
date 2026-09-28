import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { C } from '@/constants/theme';
import type { ListingItem } from '@/api';

const UNIT_LABELS: Record<string, string> = {
  per_hour: '/час',
  per_day: '/день',
  per_week: '/неделю',
  per_month: '/месяц',
};

export function formatPrice(listing: ListingItem): string {
  return `${listing.price.toLocaleString('ru-RU')} сом${UNIT_LABELS[listing.price_unit] ?? ''}`;
}

export default function ListingCard({
  listing,
  onToggleFavorite,
}: {
  listing: ListingItem;
  onToggleFavorite?: (listing: ListingItem) => void;
}) {
  return (
    <Link href={`/listing/${listing.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.imageWrap}>
          {listing.primary_image ? (
            <Image source={{ uri: listing.primary_image }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Ionicons name="home-outline" size={28} color={C.textSecondary} />
            </View>
          )}
          {onToggleFavorite && (
            <Pressable style={styles.heart} onPress={() => onToggleFavorite(listing)} hitSlop={8}>
              <Ionicons
                name={listing.is_favorited ? 'heart' : 'heart-outline'}
                size={16}
                color={listing.is_favorited ? '#FF6B35' : C.textSecondary}
              />
            </Pressable>
          )}
          {listing.is_verified && (
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={styles.badgeText}>Проверено</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>
          <Text style={styles.price}>{formatPrice(listing)}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={C.textSecondary} />
            <Text style={styles.meta} numberOfLines={1}>
              {listing.city_name || '—'}
              {listing.district_name ? `, ${listing.district_name}` : ''}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={12} color="#FF6B35" />
            <Text style={styles.meta}>
              {listing.average_rating ? listing.average_rating.toFixed(1) : '—'}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.backgroundElement,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    margin: 6,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: C.backgroundSelected,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10,14,26,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#22C55E',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    padding: 10,
    gap: 3,
  },
  title: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },
  price: {
    color: C.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    color: C.textSecondary,
    fontSize: 11,
    flexShrink: 1,
  },
});
