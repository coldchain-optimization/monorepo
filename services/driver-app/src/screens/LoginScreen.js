import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { styles } from '../styles/appStyles';

export default function LoginScreen({
  email,
  password,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onLogin,
}) {
  return (
    <View style={styles.loginCard}>
      <Text style={styles.subtitle}>Driver Login</Text>
      <TextInput
        value={email}
        onChangeText={onEmailChange}
        style={styles.input}
        autoCapitalize="none"
        placeholder="Email"
        placeholderTextColor="#999"
      />
      <TextInput
        value={password}
        onChangeText={onPasswordChange}
        style={styles.input}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor="#999"
      />
      <Pressable style={styles.primaryBtn} onPress={onLogin}>
        <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
