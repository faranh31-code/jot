import React, { useState, useCallback, useRef, useEffect } from "react";
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
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  resetPassword,
} from "../services/firebase";

try { WebBrowser.maybeCompleteAuthBrowser(); } catch {}

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

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: "574020111117-039k9rtq7oi5fkqn6vh4va50ucjne9jf.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    }
  }, [response]);

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

  async function handleGoogleSignIn(idToken: string) {
    setLoading(true);
    setError("");
    const result = await signInWithGoogle(idToken);
    setLoading(false);

    if (result.success) {
      resetForm();
      onAuthSuccess();
      handleClose();
    } else {
      setError(result.error || "Google sign-in failed");
    }
  }

  async function handleGooglePress() {
    if (mode === "signup" && !acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy");
      return;
    }
    try {
      await promptAsync();
    } catch (err) {
      setError("Google sign-in was cancelled");
    }
  }

  const bgColor = isDark ? Colors.dark.bg : Colors.light.card;
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const mutedColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const borderColor = isDark ? Colors.dark.border : Colors.light.border;
  const inputBg = isDark ? Colors.dark.card : "#f0f0f0";
  const placeholderColor = isDark ? Colors.dark.textMuted : Colors.light.textMuted;

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

            {mode !== "forgot" && (
              <>
                <Pressable
                  style={[styles.socialBtn, { backgroundColor: "#fff", borderColor: "#dadce0" }]}
                  onPress={handleGooglePress}
                  disabled={loading}
                >
                  <View style={styles.googleIconOuter}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#4285F4" }}>G</Text>
                  </View>
                  <Text style={styles.socialBtnLabel}>Continue with Google</Text>
                </Pressable>

                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                  <Text style={[styles.dividerText, { color: placeholderColor }]}>or</Text>
                  <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                </View>
              </>
            )}

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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
                  I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
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
                <ActivityIndicator color="#fff" size="small" />
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
                      Don't have an account? <Text style={styles.switchLink}>Sign Up</Text>
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
                    Already have an account? <Text style={styles.switchLink}>Sign In</Text>
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
    fontSize: FontSize.xxl,
    fontWeight: "800",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    gap: Spacing.md,
  },
  googleIconOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },
  socialBtnLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: "#3c4043",
    flex: 1,
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: FontSize.sm,
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
    color: "#FF3B30",
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
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  termsText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.accent,
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
    color: "#fff",
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
    color: Colors.accent,
    fontWeight: "700",
  },
});
