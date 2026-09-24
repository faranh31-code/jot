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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Jot } from '../types';
import { Colors, Spacing, FontSize, BorderRadius, FontFamily } from '../constants/theme';
import AdBanner from './AdBanner';

interface CollaborationModalProps {
  jot: Jot;
  isDark: boolean;
  onSave: (collaborators: string[]) => void;
  onClose: () => void;
  isPro?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CollaborationModal({
  jot,
  isDark,
  onSave,
  onClose,
  isPro = false,
}: CollaborationModalProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [collaborators, setCollaborators] = useState<string[]>(
    jot.collaborators && jot.collaborators.length ? [...jot.collaborators] : []
  );
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setCollaborators(jot.collaborators && jot.collaborators.length ? [...jot.collaborators] : []);
    setEmail('');
    setError('');
  }, [jot]);

  const addCollaborator = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    if (collaborators.includes(trimmed)) {
      setError('That person is already a collaborator.');
      return;
    }
    setCollaborators((prev) => [...prev, trimmed]);
    setEmail('');
    setError('');
  };

  const removeCollaborator = (addr: string) => {
    setCollaborators((prev) => prev.filter((c) => c !== addr));
  };

  const handleSave = () => {
    onSave(collaborators);
  };

  return (
    <Modal
      visible={true}
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Invite Collaboration</Text>
          <TouchableOpacity onPress={handleSave} style={[styles.headerButton, styles.saveHeaderButton]}>
            <Text
              style={[
                styles.saveHeaderText,
                { color: collaborators.length > 0 ? theme.accentText : theme.textMuted },
              ]}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.jotTitle, { color: theme.text }]} numberOfLines={2}>
            {jot.headline || 'Untitled'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Collaborators can view and edit this task together with you.
          </Text>

          <View style={[styles.addRow, { backgroundColor: theme.input, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={15} color={theme.textMuted} />
            <TextInput
              style={[styles.emailInput, { color: theme.text }]}
              placeholder="Email address"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError('');
              }}
              onSubmitEditing={addCollaborator}
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <TouchableOpacity
              onPress={addCollaborator}
              style={[styles.addBtn, { backgroundColor: Colors.accent }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add collaborator"
            >
              <Ionicons name="person-add" size={16} color={Colors.onAccent} />
            </TouchableOpacity>
          </View>

          {!!error && <Text style={[styles.errorText, { color: Colors.danger }]}>{error}</Text>}
          {collaborators.length === 0 && !error && (
            <Text style={[styles.hintText, { color: theme.textMuted }]}>
              No collaborators yet. Add an email to share this task.
            </Text>
          )}

          {collaborators.length > 0 && (
            <View style={styles.list}>
              {collaborators.map((addr) => (
                <View
                  key={addr}
                  style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.avatar, { backgroundColor: theme.accentLight }]}>
                    <Text style={[styles.avatarText, { color: theme.accentText }]}>
                      {addr.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.emailText, { color: theme.text }]} numberOfLines={1}>
                    {addr}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeCollaborator(addr)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${addr}`}
                  >
                    <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        {!isPro && <AdBanner isDark={isDark} position="bottom" />}
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
  jotTitle: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xl,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginBottom: Spacing.lg,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  emailInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.sm,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  hintText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  list: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  emailText: {
    flex: 1,
    fontSize: FontSize.md,
  },
});