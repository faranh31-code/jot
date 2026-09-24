import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, FontFamily } from '../constants/theme';
import { UserProfile, updateDisplayName, changePassword } from '../services/firebase';
import { trackEvent } from '../services/analytics';

interface EditProfileModalProps {
  isVisible: boolean;
  isDark: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export default function EditProfileModal({
  isVisible,
  isDark,
  user,
  onClose,
  onProfileUpdated,
}: EditProfileModalProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isPasswordUser = !!(user && user.provider && user.provider.includes('password'));
  const hasChanges =
    displayName.trim() !== (user?.displayName || '').trim() ||
    newPassword.trim().length > 0;

  useEffect(() => {
    if (isVisible) {
      setDisplayName(user?.displayName || '');
      setCurrentPassword('');
      setNewPassword('');
      setSaving(false);
      setError('');
    }
  }, [isVisible, user]);

  const handleSave = async () => {
    if (!user) return;
    setError('');
    const name = displayName.trim();
    if (!name) {
      setError('Display name can\u2019t be empty.');
      return;
    }
    if (newPassword.trim() && newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (isPasswordUser && newPassword.trim() && !currentPassword) {
      setError('Enter your current password to change it.');
      return;
    }

    setSaving(true);

    const savedName =
      name !== (user.displayName || '').trim()
        ? await updateDisplayName(name)
        : null;
    if (savedName && !savedName.success) {
      setSaving(false);
      setError(savedName.error || 'Could not update your display name.');
      return;
    }
    if (savedName) trackEvent({ event: 'display_name_updated' });

    if (isPasswordUser && newPassword.trim()) {
      const res = await changePassword(currentPassword, newPassword.trim());
      if (!res.success) {
        setSaving(false);
        setError(res.error || 'Could not change your password.');
        return;
      }
      trackEvent({ event: 'password_updated' });
    }

    setSaving(false);
    onProfileUpdated?.();
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.cancelText, { color: theme.accentText }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges || saving}
            style={[styles.headerButton, styles.saveHeaderButton]}
            accessibilityRole="button"
            accessibilityLabel="Save profile changes"
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.accentText} />
            ) : (
              <Text
                style={[
                  styles.saveHeaderText,
                  { color: hasChanges ? theme.accentText : theme.textMuted },
                ]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.featureLabel, { color: theme.textMuted }]}>DISPLAY NAME</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.input, borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={15} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Your name"
              placeholderTextColor={theme.textMuted}
              value={displayName}
              onChangeText={(t) => {
                setDisplayName(t);
                setError('');
              }}
              autoCapitalize="words"
              maxLength={40}
              returnKeyType="done"
            />
          </View>

          <Text style={[styles.hintText, { color: theme.textMuted }]}>
            Shown next to your notas when you share or collaborate.
          </Text>

          {isPasswordUser && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.featureLabel, { color: theme.textMuted }]}>PASSWORD</Text>
              <View style={[styles.inputRow, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={15} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Current password"
                  placeholderTextColor={theme.textMuted}
                  value={currentPassword}
                  onChangeText={(t) => {
                    setCurrentPassword(t);
                    setError('');
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              <View style={[styles.inputRow, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <Ionicons name="key-outline" size={15} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="New password (min 6 characters)"
                  placeholderTextColor={theme.textMuted}
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    setError('');
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
              <Text style={[styles.hintText, { color: theme.textMuted }]}>
                Leave the password fields empty to keep your current password.
              </Text>
            </>
          )}

          {!!error && <Text style={[styles.errorText, { color: Colors.danger }]}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    paddingVertical: Spacing.sm + 4,
    minWidth: 60,
    minHeight: 40,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
  },
  headerTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: FontSize.lg,
  },
  saveHeaderButton: {
    alignItems: 'flex-end',
  },
  saveHeaderText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.md,
  },
  featureLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.sm,
  },
  hintText: {
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.lg,
  },
  errorText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});