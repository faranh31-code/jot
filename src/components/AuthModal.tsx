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
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Colors, BorderRadius, Spacing, FontSize } from "../constants/theme";
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  resetPassword,
} from "../services/firebase";

WebBrowser.maybeCompleteAuthBrowser();

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

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Platform.OS === "ios"
      ? "574020111117-XXXXXXX.apps.googleusercontent.com"
      : "574020111117-XXXXXXX.apps.googleusercontent.com",
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
    if (!acceptedTerms) {
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
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy");
      return;
    }
    try {
      await promptAsync();
    } catch (err) {
      setError("Google sign-in was cancelled");
    }
  }

  async function handleAppleSignIn() {
    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy");
      return;
    }

    try {
      const nonce = Crypto.randomUUID();
      const appleResult = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (appleResult.identityToken) {
        setLoading(true);
        setError("");
        const result = await signInWithApple(appleResult.identityToken, nonce);
        setLoading(false);

        if (result.success) {
          resetForm();
          onAuthSuccess();
          handleClose();
        } else {
          setError(result.error || "Apple sign-in failed");
        }
      }
    } catch (err: any) {
      if (err.code !== "ERR_CANCELED") {
        setError("Apple sign-in failed");
      }
    }
  }

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? Colors.dark.bg : Colors.light.card,
              borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
            },
          ]}
        >
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text
              style={[styles.title, { color: isDark ? Colors.dark.text : Colors.light.text }]}
            >
              {mode === "signin" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
              ]}
            >
              {mode === "signin"
                ? "Sign in to save your entries"
                : mode === "signup"
                ? "Create an account to sync across devices"
                : "Enter your email to reset password"}
            </Text>

            {mode !== "forgot" && (
              <>
                <Pressable
                  style={[styles.socialBtn, styles.googleBtn]}
                  onPress={handleGooglePress}
                  disabled={loading}
                >
                  <Text style={styles.socialBtnText}>G</Text>
                  <Text style={[styles.socialBtnLabel, { color: isDark ? "#fff" : "#333" }]}>
                    Continue with Google
                  </Text>
                </Pressable>

                {Platform.OS === "ios" && (
                  <Pressable
                    style={[styles.socialBtn, styles.appleBtn]}
                    onPress={handleAppleSignIn}
                    disabled={loading}
                  >
                    <Text style={styles.socialBtnText}>{"\u2713"}</Text>
                    <Text style={[styles.socialBtnLabel, { color: "#fff" }]}>
                      Continue with Apple
                    </Text>
                  </Pressable>
                )}

                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: isDark ? Colors.dark.border : Colors.light.border }]} />
                  <Text style={[styles.dividerText, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>
                    or
                  </Text>
                  <View style={[styles.dividerLine, { backgroundColor: isDark ? Colors.dark.border : Colors.light.border }]} />
                </View>
              </>
            )}

            {mode === "signup" && (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? Colors.dark.card : "#f0f0f0",
                    color: isDark ? Colors.dark.text : Colors.light.text,
                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                  },
                ]}
                placeholder="Name"
                placeholderTextColor={isDark ? Colors.dark.textMuted : Colors.light.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? Colors.dark.card : "#f0f0f0",
                  color: isDark ? Colors.dark.text : Colors.light.text,
                  borderColor: isDark ? Colors.dark.border : Colors.light.border,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={isDark ? Colors.dark.textMuted : Colors.light.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            {mode !== "forgot" && (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? Colors.dark.card : "#f0f0f0",
                    color: isDark ? Colors.dark.text : Colors.light.text,
                    borderColor: isDark ? Colors.dark.border : Colors.light.border,
                  },
                ]}
                placeholder="Password"
                placeholderTextColor={isDark ? Colors.dark.textMuted : Colors.light.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            )}

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Pressable
              style={styles.termsRow}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: acceptedTerms ? Colors.accent : "transparent",
                    borderColor: acceptedTerms ? Colors.accent : isDark ? Colors.dark.border : Colors.light.border,
                  },
                ]}
              >
                {acceptedTerms && <Text style={styles.checkmark}>{"\u2713"}</Text>}
              </View>
              <Text
                style={[
                  styles.termsText,
                  { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary },
                ]}
              >
                I agree to the{" "}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>

            <Pressable
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleEmailSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === "signin"
                    ? "Sign In"
                    : mode === "signup"
                    ? "Create Account"
                    : "Send Reset Link"}
                </Text>
              )}
            </Pressable>

            <View style={styles.switchMode}>
              {mode === "signin" ? (
                <>
                  <Pressable onPress={() => { setMode("signup"); setError(""); }}>
                    <Text style={[styles.switchText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                      Don't have an account?{" "}
                      <Text style={styles.switchLink}>Sign Up</Text>
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => { setMode("forgot"); setError(""); }}>
                    <Text style={[styles.switchText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary, marginTop: Spacing.sm }]}>
                      Forgot password?
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => { setMode("signin"); setError(""); }}>
                  <Text style={[styles.switchText, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
                    Already have an account?{" "}
                    <Text style={styles.switchLink}>Sign In</Text>
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
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#444",
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
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
    gap: Spacing.sm,
  },
  googleBtn: {
    backgroundColor: "#fff",
    borderColor: "#e0e0e0",
  },
  appleBtn: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  socialBtnText: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#333",
    width: 28,
    textAlign: "center",
  },
  socialBtnLabel: {
    fontSize: FontSize.md,
    fontWeight: "600",
    flex: 1,
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
