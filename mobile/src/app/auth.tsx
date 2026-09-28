import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api, setToken } from '@/api';
import { C } from '@/constants/theme';

type Step = 'email' | 'code';

export default function AuthScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isRegistered, setIsRegistered] = useState(true);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    setError(null);
    if (!email.includes('@')) {
      setError('Введите корректный email');
      return;
    }
    setLoading(true);
    try {
      const res = await api.sendOtp(email.trim());
      setIsRegistered(res.data?.is_registered ?? true);
      setDevCode(res.data?.dev_code ?? null);
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отправки кода');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setError(null);
    if (code.trim().length < 4) {
      setError('Введите код из письма');
      return;
    }
    setLoading(true);
    try {
      await api.verifyOtp(email.trim(), code.trim());
      if (isRegistered) {
        const res = await api.login(email.trim(), code.trim());
        await setToken(res.data.access_token);
      } else {
        const res = await api.register(email.trim(), code.trim(), name.trim() || email.split('@')[0]);
        await setToken(res.data.access_token);
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>R</Text>
        </View>
        <Text style={styles.heading}>RentHub</Text>
        <Text style={styles.sub}>
          {step === 'email'
            ? 'Введите email — мы отправим код подтверждения'
            : `Код отправлен на ${email}`}
        </Text>

        {step === 'email' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Ваше имя (для регистрации)"
              placeholderTextColor={C.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={C.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Pressable style={styles.button} onPress={sendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Получить код</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="••••"
              placeholderTextColor={C.textSecondary}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            {devCode && <Text style={styles.dev}>DEV-код: {devCode}</Text>}
            <Pressable style={styles.button} onPress={confirm} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Подтвердить</Text>}
            </Pressable>
            <Pressable
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}>
              <Text style={styles.link}>Изменить email</Text>
            </Pressable>
          </>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#F87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: C.background,
  },
  container: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  heading: {
    color: C.text,
    fontSize: 26,
    fontWeight: '800',
  },
  sub: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: C.backgroundElement,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    color: C.text,
    fontSize: 15,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '700',
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: C.accent,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  dev: {
    color: C.textSecondary,
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(248,113,113,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    flexShrink: 1,
  },
});
