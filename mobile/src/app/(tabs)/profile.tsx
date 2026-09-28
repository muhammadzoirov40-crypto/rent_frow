import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api, getToken, setToken, type User } from '@/api';
import { C } from '@/constants/theme';

const MENU = [
  { icon: 'list-outline', label: 'Мои объявления' },
  { icon: 'file-tray-full-outline', label: 'Заявки на аренду' },
  { icon: 'chatbubbles-outline', label: 'Сообщения' },
  { icon: 'settings-outline', label: 'Настройки' },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!getToken()) return;
      setLoading(true);
      setError(null);
      api
        .me()
        .then((res) => setUser(res.data))
        .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
        .finally(() => setLoading(false));
    }, []),
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
        <Text style={styles.title}>Профиль</Text>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={36} color={C.accent} />
          </View>
          <Text style={styles.hint}>Войдите, чтобы управлять объявлениями и заявками</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/auth')}>
            <Text style={styles.primaryBtnText}>Войти / Регистрация</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Профиль</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {(user?.display_name || user?.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.display_name || 'Пользователь'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role === 'ADMIN' ? 'Администратор' : 'Арендатор'}</Text>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.menu}>
        {MENU.map((item) => (
          <View key={item.label} style={styles.menuItem}>
            <Ionicons name={item.icon} size={18} color={C.textSecondary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
          </View>
        ))}
      </View>

      <Pressable
        style={styles.logout}
        onPress={async () => {
          await setToken(null);
          setUser(null);
        }}>
        <Ionicons name="log-out-outline" size={18} color="#F87171" />
        <Text style={styles.logoutText}>Выйти</Text>
      </Pressable>
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
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: C.backgroundElement,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,107,53,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: C.accent,
    fontSize: 30,
    fontWeight: '800',
  },
  name: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
  },
  email: {
    color: C.textSecondary,
    fontSize: 13,
  },
  roleBadge: {
    backgroundColor: C.backgroundSelected,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  hint: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  menu: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: C.backgroundElement,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuLabel: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(248,113,113,0.1)',
  },
  logoutText: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 14,
  },
  error: {
    color: '#F87171',
    fontSize: 13,
  },
});
