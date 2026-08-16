import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import * as Location from "expo-location";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E6C55C";
const DARK = "#0C0A06";

export default function App() {
  const [baseUrl, setBaseUrl] = useState("http://192.168.1.100:4001/api/v1");
  const [email, setEmail] = useState("hoodazoz2030@gmail.com");
  const [stage, setStage] = useState<"login" | "otp" | "tracking">("login");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [lastPos, setLastPos] = useState("—");
  const [sentCount, setSentCount] = useState(0);

  const requestOtp = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(baseUrl + "/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email.trim(), channel: "EMAIL" }),
      });
      if (r.ok) { setStage("otp"); setMsg("📧 OTP اتبعت لإيميلك"); }
      else setMsg("فشل الطلب — تأكد من الـ Server URL");
    } catch (e: any) {
      setMsg("Network error: " + e.message);
    }
    setBusy(false);
  };

  const verify = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(baseUrl + "/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email.trim(), channel: "EMAIL", code: code.trim() }),
      });
      const d = await r.json();
      if (d.accessToken) { setToken(d.accessToken); setStage("tracking"); }
      else setMsg("كود غلط — جرب تاني");
    } catch (e: any) {
      setMsg("Error: " + e.message);
    }
    setBusy(false);
  };

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { setMsg("لازم تسمح بالـ Location"); return; }
    setTracking(true);
    setMsg("🛰 بيتتبع موقعك لايف...");
    await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLastPos(latitude.toFixed(5) + ", " + longitude.toFixed(5));
        try {
          await fetch(baseUrl + "/locations/me", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({ latitude, longitude, accuracy, source: "GPS" }),
          });
          setSentCount((c) => c + 1);
        } catch {}
      }
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.logo}>🏺 KEMRAA</Text>
          <Text style={styles.tagline}>The Land of the Sun</Text>
        </View>

        {stage === "login" && (
          <View style={styles.card}>
            <Text style={styles.title}>تسجيل الدخول</Text>
            <Text style={styles.label}>Server URL</Text>
            <TextInput style={styles.input} value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" />
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={styles.btn} onPress={requestOtp} disabled={busy}>
              {busy ? <ActivityIndicator color={DARK} /> : <Text style={styles.btnText}>إرسال الكود</Text>}
            </TouchableOpacity>
          </View>
        )}

        {stage === "otp" && (
          <View style={styles.card}>
            <Text style={styles.title}>أدخل الكود</Text>
            <Text style={styles.label}>OTP (من إيميلك)</Text>
            <TextInput style={[styles.input, styles.otpInput]} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="______" />
            <TouchableOpacity style={styles.btn} onPress={verify} disabled={busy}>
              {busy ? <ActivityIndicator color={DARK} /> : <Text style={styles.btnText}>دخول</Text>}
            </TouchableOpacity>
          </View>
        )}

        {stage === "tracking" && (
          <View style={styles.card}>
            <Text style={styles.title}>📍 Live Tracking</Text>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{sentCount}</Text>
                <Text style={styles.statLabel}>تحديثات مرسلة</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { fontSize: 14 }]}>{lastPos}</Text>
                <Text style={styles.statLabel}>آخر موقع</Text>
              </View>
            </View>
            {!tracking ? (
              <TouchableOpacity style={styles.btn} onPress={startTracking}>
                <Text style={styles.btnText}>🛰 ابدأ التتبع المباشر</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE — موقعك ظاهر على خريطة الـ Admin</Text>
              </View>
            )}
          </View>
        )}

        {msg !== "" && <Text style={styles.msg}>{msg}</Text>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FAF7EF" },
  header: { alignItems: "center", paddingTop: 40, paddingBottom: 20 },
  logo: { fontSize: 32, fontWeight: "800", color: GOLD, letterSpacing: 2 },
  tagline: { fontSize: 12, color: "#8C6D1F", marginTop: 4, letterSpacing: 1 },
  card: { margin: 20, backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: GOLD + "55", shadowColor: GOLD, shadowOpacity: 0.15, shadowRadius: 12, elevation: 3 },
  title: { fontSize: 20, fontWeight: "700", color: DARK, marginBottom: 16 },
  label: { fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, fontSize: 14, color: DARK },
  otpInput: { fontSize: 24, letterSpacing: 8, textAlign: "center", fontWeight: "700" },
  btn: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  btnText: { color: DARK, fontWeight: "700", fontSize: 16 },
  msg: { textAlign: "center", color: "#8C6D1F", marginBottom: 20, fontSize: 13 },
  statRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: "#F0D78C33", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: GOLD + "33" },
  statValue: { fontSize: 22, fontWeight: "800", color: "#8C6D1F" },
  statLabel: { fontSize: 10, color: "#6b7280", marginTop: 4 },
  liveBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#dcfce7", borderRadius: 10, paddingVertical: 12, gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#10B981" },
  liveText: { color: "#166534", fontWeight: "700", fontSize: 13 },
});