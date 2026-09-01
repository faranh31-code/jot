import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Colors, BorderRadius, Spacing, FontSize, FontFamily } from "../constants/theme";
import {
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
} from "../services/firebase";

interface AuthModalProps {
  isVisible: boolean;
  isDark: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export default function AuthModal({ isVisible, isDark, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  function resetForm() {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError("");
    setAcceptedTerms(false);
  }

  function handleClose() {
    resetForm();
    setMode("signin");
    onClose();
  }

  async function handleEmailSubmit() {
    if (mode === "signup" && !acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    let result;
    if (mode === "signup") {
      result = await signUpWithEmail(email.trim(), password);
    } else if (mode === "signin") {
      result = await signInWithEmail(email.trim(), password);
    } else if (mode === "forgot") {
      result = await resetPassword(email.trim());
      if (result.success) {
        setError("");
        Alert.alert("Check your email", "Password reset link sent to your email.");
        setMode("signin");
        setLoading(false);
        return;
      }
    }

    setLoading(false);

    if (result?.success) {
      resetForm();
      onAuthSuccess();
      handleClose();
    } else {
      setError(result?.error || "Something went wrong");
    }
  }

  const bgColor = isDark ? Colors.dark.bg : Colors.light.card;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const mutedColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const borderColor = isDark ? Colors.dark.border : Colors.light.border;
  const inputBg = isDark ? Colors.dark.card : Colors.light.input;
  const placeholderColor = isDark ? Colors.dark.textMuted : Colors.light.textMuted;
  const linkColor = isDark ? Colors.dark.accentText : Colors.light.accentText;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: textColor }]}>
              {mode === "signin" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
            </Text>
            <Text style={[styles.subtitle, { color: mutedColor }]}>
              {mode === "signin"
                ? "Sign in to save your entries"
                : mode === "signup"
                ? "Create an account to sync across devices"
                : "Enter your email to reset password"}
            </Text>

            {mode === "signup" && (
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                placeholder="Name"
                placeholderTextColor={placeholderColor}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
              placeholder="Email"
              placeholderTextColor={placeholderColor}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            {mode !== "forgot" && (
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                placeholder="Password"
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            )}

            {error ? <Text style={[styles.errorText, { color: Colors.danger }]}>{error}</Text> : null}

            {mode === "signup" && (
              <Pressable
                style={styles.termsRow}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: acceptedTerms ? Colors.accent : "transparent",
                      borderColor: acceptedTerms ? Colors.accent : borderColor,
                    },
                  ]}
                >
                  {acceptedTerms && <Text style={styles.checkmark}>{"\u2713"}</Text>}
                </View>
                <Text style={[styles.termsText, { color: mutedColor }]}>
                  I agree to the <Text style={[styles.termsLink, { color: linkColor }]}>Terms of Service</Text> and{" "}
                  <Text style={[styles.termsLink, { color: linkColor }]}>Privacy Policy</Text>
                </Text>
              </Pressable>
            )}

            {mode === "signin" && (
              <Pressable
                style={styles.termsRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: rememberMe ? Colors.accent : "transparent",
                      borderColor: rememberMe ? Colors.accent : borderColor,
                    },
                  ]}
                >
                  {rememberMe && <Text style={styles.checkmark}>{"\u2713"}</Text>}
                </View>
                <Text style={[styles.termsText, { color: mutedColor }]}>Remember Me</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleEmailSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.onAccent} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                </Text>
              )}
            </Pressable>

            <View style={styles.switchMode}>
              {mode === "signin" ? (
                <>
                  <Pressable onPress={() => { setMode("signup"); setError(""); }}>
                    <Text style={[styles.switchText, { color: mutedColor }]}>
                      Don't have an account? <Text style={[styles.switchLink, { color: linkColor }]}>Sign Up</Text>
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => { setMode("forgot"); setError(""); }}>
                    <Text style={[styles.switchText, { color: mutedColor, marginTop: Spacing.sm }]}>
                      Forgot password?
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => { setMode("signin"); setError(""); }}>
                  <Text style={[styles.switchText, { color: mutedColor }]}>
                    Already have an account? <Text style={[styles.switchLink, { color: linkColor }]}>Sign In</Text>
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    maxHeight: "85%",
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.xxl,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkmark: {
    color: Colors.onAccent,
    fontSize: 12,
    fontWeight: "700",
  },
  termsText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  termsLink: {
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: Colors.onAccent,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  switchMode: {
    alignItems: "center",
  },
  switchText: {
    fontSize: FontSize.sm,
  },
  switchLink: {
    fontWeight: "700",
  },
});
