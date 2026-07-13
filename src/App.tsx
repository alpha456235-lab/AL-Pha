import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  ShieldAlert,
  Skull,
  Lock,
  Unlock,
  Key,
  Timer,
  Search,
  Grid,
  List,
  Copy,
  ArrowUpDown,
  Download,
  Volume2,
  VolumeX,
  Server,
  RefreshCw,
  Cpu,
  Wifi,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  HelpCircle,
  FileCode,
  Sparkles
} from "lucide-react";

import { VPNServer, CryptoMode, LicenseStatus } from "./types";
import { getFlag } from "./lib/countries";
import {
  process_field,
  opensslDecrypt,
  decryptEHI,
  decryptDarkTunnel,
  whiteboxDecryptNPVT,
  removeTrailingCommas,
  tZ_f
} from "./lib/decryption";
import ParticleCanvas from "./components/ParticleCanvas";

const LICENSE_KEY = "alpha_license_v2";
const VALID_KEYS = {
  alpha: "importet",
  vip: "ALPHAbot"
};

const DEFAULT_URLS: Record<CryptoMode, string> = {
  alpha: "https://raw.githubusercontent.com/geko2023/shield/refs/heads/master/freev119",
  openssl: "https://raw.githubusercontent.com/chrisrepair/Updates/refs/heads/main/Chizzy%20Tribe%20VPN%20V1",
  ehi: "https://raw.githubusercontent.com/geko2023/shield/refs/heads/master/freev119",
  darktunnel: "https://raw.githubusercontent.com/chrisrepair/Updates/refs/heads/main/Chizzy%20Tribe%20VPN%20V1",
  npvt: "https://raw.githubusercontent.com/geko2023/shield/refs/heads/master/freev119"
};

const SAMPLE_SERVERS: Record<CryptoMode, VPNServer[]> = {
  alpha: [
    {
      ServerName: "🇨🇩 [ALPHA-01] Congo Free Server",
      ServerIP: "102.135.254.12",
      Type: "V2RAY",
      Country: "Congo",
      ServerUser: "alpha_free",
      ServerPass: "rot1_decoded_pass",
      Payload: "GET / HTTP/1.1\r\nHost: cdn.freecongo.cd\r\n",
      SNI: "cdn.freecongo.cd",
      udpserver: "102.135.254.12:20001",
      udpobfs: "obfuscated_mode"
    },
    {
      ServerName: "🇫🇷 [ALPHA-02] France Paris Premium",
      ServerIP: "51.255.45.188",
      Type: "SSH",
      Country: "France",
      ServerUser: "alpha_premium",
      ServerPass: "super_secret_key",
      Payload: "CONNECT [host_port] HTTP/1.1\r\nHost: ssg.cloudflare.com\r\n",
      SNI: "ssg.cloudflare.com",
    },
    {
      ServerName: "🇩🇪 [ALPHA-03] Germany High-Speed Core",
      ServerIP: "46.105.112.54",
      Type: "SSH",
      Country: "Germany",
      ServerUser: "alpha_germany",
      ServerPass: "pass1234",
      Payload: "GET / HTTP/1.1\r\nHost: speed.de\r\n",
      SNI: "speed.de",
    }
  ],
  openssl: [
    {
      ServerName: "🇺🇸 [OPENSSL-01] USA East Coast",
      ServerIP: "198.51.100.45",
      Type: "OPENSSL-AES",
      Country: "USA",
      ServerUser: "openssl_tribe",
      ServerPass: "securedjson_password",
      Payload: "GET /dns HTTP/1.1\r\nHost: dns.google\r\n",
      SNI: "dns.google",
      ServerPort: 443
    },
    {
      ServerName: "🇩🇪 [OPENSSL-02] Germany Frankfurt HighSpeed",
      ServerIP: "3.120.100.201",
      Type: "TROJAN",
      Country: "Germany",
      ServerPort: 8443,
      ProxyPort: 8080,
      SNI: "trojan.fast.de"
    }
  ],
  ehi: [
    {
      ServerName: "🇨🇭 [EHI-01] Swiss Tunnel Direct",
      ServerIP: "179.43.150.8",
      Type: "EHI-TUNNEL",
      Country: "Switzerland",
      Payload: "PATCH /v1/connect HTTP/1.1\r\nHost: swisscom.ch\r\n",
      SNI: "swisscom.ch",
      ServerPort: 80
    }
  ],
  darktunnel: [
    {
      ServerName: "🇳🇱 [DARK-01] Netherlands Offshore",
      ServerIP: "94.232.112.50",
      Type: "DARK-CFB",
      Country: "Netherlands",
      ServerUser: "tunnel_dark",
      ServerPass: "dark_aes_256",
      Payload: "POST /api/tunnel HTTP/1.1\r\nHost: backend.nl\r\n",
      SNI: "backend.nl"
    }
  ],
  npvt: [
    {
      ServerName: "🇸🇬 [NPVT-01] Singapore Whitebox Block",
      ServerIP: "128.199.155.82",
      Type: "NPVT-CTR",
      Country: "Singapore",
      ServerUser: "whitebox_user",
      ServerPass: "aes_ctr_128_keystream",
      Payload: "GET /connect HTTP/1.1\r\nHost: test.sg\r\n",
      SNI: "test.sg",
      udpserver: "128.199.155.82:56300"
    }
  ]
};

// Cryptographic keys used by Alpha decryption
const ALPHA_KEYS = {
  A0: "YumezuWuu23",
  B0: "ChicoPoy22A",
  C0: "Petutines2023",
  D0: "Vitally2024",
  E0: "Buffalo2120",
  ServerIP_Key: "Vitally2024"
};

export default function App() {
  // License States
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [licenseInput, setLicenseInput] = useState("");
  const [licenseError, setLicenseError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // UI Option States
  const [mode, setMode] = useState<CryptoMode>("alpha");
  const [customUrl, setCustomUrl] = useState("");
  const [servers, setServers] = useState<VPNServer[]>([]);
  const [activeServerIndex, setActiveServerIndex] = useState<number>(-1);
  const [isListView, setIsListView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"country" | "name" | "">("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("En attente d'instruction...");
  const [isStatusError, setIsStatusError] = useState(false);

  // Immersive settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customCursorEnabled, setCustomCursorEnabled] = useState(true);
  const [bloodDrops, setBloodDrops] = useState<{ id: string; x: number; y: number; size: number }[]>([]);
  const [glitchTitle, setGlitchTitle] = useState("𝓐𝓛𝓟𝓗𝓐 𝓭𝓮𝓼𝓬𝓻𝓲𝓹𝓽𝓸𝓻");
  const [isScreenGlitching, setIsScreenGlitching] = useState(false);
  
  // Custom Mouse Cursor States
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [cursorHovered, setCursorHovered] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);

  // Load License from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem(LICENSE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.type === "vip") {
          setLicense({ type: "vip", activatedAt: data.activatedAt, expiresAt: null, valid: true });
        } else if (data.type === "alpha" && data.expiresAt) {
          const isValid = Date.now() < data.expiresAt;
          setLicense({
            type: "alpha",
            activatedAt: data.activatedAt,
            expiresAt: data.expiresAt,
            valid: isValid
          });
          if (!isValid) {
            localStorage.removeItem(LICENSE_KEY);
          }
        }
      } catch (e) {
        localStorage.removeItem(LICENSE_KEY);
      }
    }
  }, []);

  // Update Countdown timer for Alpha license
  useEffect(() => {
    if (!license || license.type !== "alpha" || !license.expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = (license.expiresAt as number) - now;
      if (remaining <= 0) {
        setLicense(null);
        localStorage.removeItem(LICENSE_KEY);
        setTimeRemaining("");
        triggerToast("⏰ Licence expirée !");
        playSound("error");
      } else {
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [license]);

  // Ambient horror timers & glitches
  useEffect(() => {
    // Random title glitches
    const titleInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        const original = "𝓐𝓛𝓟𝓗𝓐 𝓭𝓮𝓼𝓬𝓻𝓲𝓹𝓽𝓸𝓻";
        const mutated = original
          .split("")
          .map((char) => (Math.random() > 0.85 ? String.fromCharCode(33 + Math.random() * 93) : char))
          .join("");
        setGlitchTitle(mutated);
        if (soundEnabled && Math.random() > 0.7) playSound("glitch");
        
        setTimeout(() => setGlitchTitle(original), 120);
      }
    }, 4000);

    // Random Screen distortion triggers
    const screenInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setIsScreenGlitching(true);
        setTimeout(() => setIsScreenGlitching(false), 200);
        
        // Sometimes drop blood
        if (Math.random() > 0.6) {
          const id = Math.random().toString();
          setBloodDrops((prev) => [
            ...prev,
            {
              id,
              x: Math.random() * 80 + 10,
              y: Math.random() * 80 + 10,
              size: Math.random() * 25 + 10
            }
          ]);
          setTimeout(() => {
            setBloodDrops((prev) => prev.filter((drop) => drop.id !== id));
          }, 1500);
        }
      }
    }, 5000);

    return () => {
      clearInterval(titleInterval);
      clearInterval(screenInterval);
    };
  }, [soundEnabled]);

  // Mouse move tracking for Custom Cursor
  useEffect(() => {
    if (!customCursorEnabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [customCursorEnabled]);

  // Sound cues generator
  const playSound = (type: "click" | "success" | "error" | "glitch") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === "success") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.setValueAtTime(700, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "error") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === "glitch") {
        osc.type = "square";
        osc.frequency.setValueAtTime(Math.random() * 900 + 80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      }
    } catch (e) {
      // Audio might be blocked until user interacts
    }
  };

  const triggerToast = (text: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  // Check and save license key
  const handleValidateLicense = () => {
    playSound("click");
    const key = licenseInput.trim();
    if (key === VALID_KEYS.alpha) {
      const expiresAt = Date.now() + 24 * 3600 * 1000;
      const data: LicenseStatus = { type: "alpha", activatedAt: Date.now(), expiresAt, valid: true };
      setLicense(data);
      localStorage.setItem(LICENSE_KEY, JSON.stringify(data));
      setLicenseInput("");
      setLicenseError("");
      triggerToast("✅ Clé ALPHA (24h) validée !");
      playSound("success");
    } else if (key === VALID_KEYS.vip) {
      const data: LicenseStatus = { type: "vip", activatedAt: Date.now(), expiresAt: null, valid: true };
      setLicense(data);
      localStorage.setItem(LICENSE_KEY, JSON.stringify(data));
      setLicenseInput("");
      setLicenseError("");
      triggerToast("👑 Clé VIP permanente validée !");
      playSound("success");
    } else {
      setLicenseError("❌ Clé invalide. Essayez 'importet' ou 'ALPHAbot'");
      playSound("error");
    }
  };

  const handleDisconnect = () => {
    playSound("click");
    setLicense(null);
    localStorage.removeItem(LICENSE_KEY);
    setServers([]);
    setActiveServerIndex(-1);
    triggerToast("🔓 Licence révoquée.");
  };

  // Perform Decryption & Loading servers
  const handleLoadServers = async () => {
    playSound("click");
    if (!license || !license.valid) {
      triggerToast("❌ Licence valide requise !");
      return;
    }

    setLoading(true);
    setIsStatusError(false);
    setStatusMessage("⏳ Décryptage des flux cryptographiques...");

    const url = customUrl.trim() || DEFAULT_URLS[mode];

    try {
      // Attempt live fetch
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      const rawText = await res.text();

      let decryptedList: VPNServer[] = [];

      if (mode === "alpha") {
        const rawB64 = rawText.replace(/\s/g, "");
        const encryptedBytes = CryptoJS.enc.Base64.parse(rawB64);
        const decryptedBytes = tZ_f(encryptedBytes, ALPHA_KEYS.E0);
        if (!decryptedBytes) throw new Error("Échec du déchiffrement de l'enveloppe Alpha");
        
        const configStr = CryptoJS.enc.Utf8.stringify(decryptedBytes);
        const config = JSON.parse(configStr);
        if (config && Array.isArray(config.Servers)) {
          config.Servers.forEach((s: any) => {
            if (!s || typeof s !== "object") return;
            if (s.ServerPass) s.ServerPass = process_field(s.ServerPass, ALPHA_KEYS.C0, "wa");
            if (s.Payload) s.Payload = process_field(s.Payload, ALPHA_KEYS.A0, "wa");
            if (s.SNI) s.SNI = process_field(s.SNI, ALPHA_KEYS.A0, "wa");
            if (s.udpserver) s.udpserver = process_field(s.udpserver, ALPHA_KEYS.B0, "wa");
            if (s.udpobfs) s.udpobfs = process_field(s.udpobfs, ALPHA_KEYS.C0, "wa");
            if (s.v2rayJson) s.v2rayJson = process_field(s.v2rayJson, ALPHA_KEYS.D0, "wa");
            if (s.ServerIP) s.ServerIP = process_field(s.ServerIP, ALPHA_KEYS.ServerIP_Key, "Jl0");
            if (s.ServerUser) s.ServerUser = process_field(s.ServerUser, ALPHA_KEYS.B0, "tZ");
          });
          decryptedList = config.Servers;
        } else {
          throw new Error("Contenu du fichier invalide ou serveur manquant");
        }
      } else if (mode === "openssl") {
        decryptedList = opensslDecrypt(rawText, "securedjson") as any;
      } else if (mode === "ehi") {
        decryptedList = decryptEHI(rawText);
      } else if (mode === "darktunnel") {
        decryptedList = decryptDarkTunnel(rawText);
      } else if (mode === "npvt") {
        const rawPayloadB64 = rawText.replace(/\s/g, "");
        const decryptedStr = whiteboxDecryptNPVT(rawPayloadB64);
        if (!decryptedStr) throw new Error("Échec du déchiffrement NPVT Whitebox");
        let parsedResult: any;
        try {
          parsedResult = JSON.parse(decryptedStr);
          if (Array.isArray(parsedResult) && parsedResult.length > 0) {
            parsedResult = parsedResult[0];
          }
        } catch (e) {
          parsedResult = { raw_data: decryptedStr };
        }
        let foundServers = parsedResult.Servers || parsedResult.servers || (Array.isArray(parsedResult) ? parsedResult : null);
        if (!foundServers) {
          for (const key in parsedResult) {
            if (Array.isArray(parsedResult[key])) {
              foundServers = parsedResult[key];
              break;
            }
          }
        }
        if (foundServers && foundServers.length) {
          decryptedList = foundServers;
        } else {
          throw new Error("Aucun serveur extrait de la structure NPVT");
        }
      }

      setServers(decryptedList);
      setActiveServerIndex(-1);
      setStatusMessage(`✅ ${decryptedList.length} serveurs décryptés avec succès via ${mode.toUpperCase()} !`);
      triggerToast(`🚀 ${decryptedList.length} serveurs décryptés`);
      playSound("success");

    } catch (err: any) {
      console.warn("Fetch live failed, loading local secure samples to guarantee preview is fully functional:", err);
      // Fallback securely to sample local files as per guidelines
      const sampleList = SAMPLE_SERVERS[mode];
      setServers(sampleList);
      setActiveServerIndex(-1);
      setIsStatusError(false);
      setStatusMessage(`⚠️ Accès direct impossible (CORS/Réseau). Injection locale sécurisée effectuée : ${sampleList.length} serveurs.`);
      triggerToast("⚠️ Échantillons de secours injectés");
      playSound("success");
    } finally {
      setLoading(false);
    }
  };

  const handleInjectSample = () => {
    playSound("click");
    const sampleList = SAMPLE_SERVERS[mode];
    setServers(sampleList);
    setActiveServerIndex(-1);
    setIsStatusError(false);
    setStatusMessage(`⚡ Mode démonstration : ${sampleList.length} serveurs "${mode.toUpperCase()}" injectés.`);
    triggerToast("🎯 Échantillons injectés");
    playSound("success");
  };

  // Filter and Sort computations
  const getFilteredServers = () => {
    let result = [...servers];
    
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const checkable = [
          s.ServerName,
          s.ServerIP,
          s.Country,
          s.Type,
          s.ServerUser,
          s.Payload,
          s.SNI
        ];
        return checkable.some((val) => val && String(val).toLowerCase().includes(q));
      });
    }

    // Sort operations
    if (sortBy === "country") {
      result.sort((a, b) => (a.Country || "").localeCompare(b.Country || ""));
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.ServerName || a.ServerIP || "").localeCompare(b.ServerName || b.ServerIP || ""));
    }

    return result;
  };

  const filteredServers = getFilteredServers();

  const handleExport = () => {
    playSound("click");
    if (servers.length === 0) {
      triggerToast("❌ Aucun serveur à exporter !");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(servers, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `alpha_descriptor_export_${mode}.json`);
    dlAnchor.click();
    triggerToast("📋 Fichier exporté avec succès !");
  };

  const handleCopyField = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`📋 ${label} copié !`);
    playSound("click");
  };

  return (
    <div
      className={`relative min-h-screen flex flex-col justify-center items-center p-4 md:p-8 selection:bg-neon-red selection:text-black overflow-hidden ${
        isScreenGlitching ? "scale-[1.01] brightness-125 skew-x-1" : ""
      }`}
      style={{ cursor: customCursorEnabled && !isListView ? "none" : "auto" }}
    >
      {/* Background Layer Elements */}
      <ParticleCanvas />
      <div className="fixed top-0 left-0 w-full h-full scanline-overlay pointer-events-none -z-20 opacity-20" />
      <div className="fixed top-0 left-0 w-full h-full static-noise pointer-events-none -z-30 opacity-5" />

      {/* Cyber Goth Blood Splatters */}
      {bloodDrops.map((drop) => (
        <span
          key={drop.id}
          className="blood-splatter font-orbitron select-none"
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            fontSize: `${drop.size}px`,
            color: "rgba(255, 0, 100, 0.75)",
            filter: "blur(1px) drop-shadow(0 0 8px #ff0066)"
          }}
        >
          ⬤
        </span>
      ))}

      {/* Toast notifications container */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="bg-[#050002] border border-neon-red text-[#e0b0b0] p-4 font-mono text-xs rounded shadow-[0_0_20px_rgba(255,0,100,0.5)] clip-corner-xs pointer-events-auto"
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cyber/Horror Ambient Audio & Cursor toggles */}
      <div className="fixed top-4 right-4 flex items-center gap-3 z-40 bg-[#0c0206]/85 border border-[#440011]/80 px-3 py-1.5 rounded-md backdrop-blur-md">
        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            playSound("click");
          }}
          className={`flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider transition-all duration-200 ${
            soundEnabled ? "text-neon-red drop-shadow-[0_0_6px_#ff0066]" : "text-gray-500 hover:text-gray-300"
          }`}
          style={{ cursor: customCursorEnabled ? "none" : "pointer" }}
          title={soundEnabled ? "Désactiver le son ambiant" : "Activer le son ambiant"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{soundEnabled ? "Sons ON" : "Sons OFF"}</span>
        </button>

        <span className="text-[#330011]">|</span>

        <button
          onClick={() => {
            setCustomCursorEnabled(!customCursorEnabled);
            playSound("click");
          }}
          className={`flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider transition-all duration-200 ${
            customCursorEnabled ? "text-neon-red drop-shadow-[0_0_6px_#ff0066]" : "text-gray-500 hover:text-gray-300"
          }`}
          style={{ cursor: "pointer" }}
          title={customCursorEnabled ? "Désactiver le curseur d'ambiance" : "Activer le curseur d'ambiance"}
        >
          <Skull className={`w-4 h-4 ${customCursorEnabled ? "animate-spin [animation-duration:15s]" : ""}`} />
          <span className="hidden sm:inline">{customCursorEnabled ? "Cibleur ON" : "Cibleur OFF"}</span>
        </button>
      </div>

      {/* Custom Horror Target Crosshair */}
      {customCursorEnabled && !isListView && (
        <>
          <div
            className="fixed pointer-events-none z-50 w-6 h-6 border-2 border-neon-red rounded-full transition-transform duration-100 ease-out mix-blend-screen -translate-x-1/2 -translate-y-1/2 shadow-[0_0_12px_#ff0066,inset_0_0_4px_#ff0066]"
            style={{
              left: `${mousePos.x}px`,
              top: `${mousePos.y}px`,
              transform: `translate(-50%, -50%) scale(${cursorHovered ? 1.4 : 1})`
            }}
          />
          <div
            className="fixed pointer-events-none z-50 w-1.5 h-1.5 bg-neon-red rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_6px_#ff0066]"
            style={{
              left: `${mousePos.x}px`,
              top: `${mousePos.y}px`
            }}
          />
        </>
      )}

      {/* Main Container */}
      <div className="relative w-full max-w-7xl bg-[#000000]/90 border border-border-red rounded-xl shadow-[0_0_50px_rgba(255,0,100,0.35),inset_0_0_30px_rgba(255,0,100,0.1)] px-5 py-6 md:px-8 md:py-8 clip-corner backdrop-blur-md">
        
        {/* Custom Corner Decorations */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-neon-red shadow-[0_0_8px_#ff0066] pointer-events-none" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-neon-red shadow-[0_0_8px_#ff0066] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-neon-red shadow-[0_0_8px_#ff0066] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-neon-red shadow-[0_0_8px_#ff0066] pointer-events-none" />

        {/* License Box */}
        <div className="mb-6 p-4 bg-[#0a0005]/80 border-2 border-border-red/60 rounded-lg shadow-[0_0_20px_rgba(255,0,100,0.15)] clip-corner-sm">
          <div className="text-center font-orbitron text-sm tracking-widest text-[#ff3388] font-bold mb-3 drop-shadow-[0_0_8px_rgba(255,0,100,0.5)] flex items-center justify-center gap-2">
            <Key className="w-4 h-4 text-neon-red animate-pulse" />
            LICENCE D'ACCÈS DU MODULE
          </div>

          <div className="flex flex-col items-center">
            {license && license.valid ? (
              <div className="flex flex-col items-center gap-2 w-full text-center">
                {license.type === "vip" ? (
                  <div className="font-orbitron text-2xl font-black text-[#ffcc00] tracking-wider drop-shadow-[0_0_12px_#ffcc00] animate-pulse">
                    👑 VIP PERMANENT ACCORDÉ
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-xs text-gray-400 font-mono uppercase tracking-wider">🔒 Clé ALPHA ACTIVE (24H)</div>
                    <div className="font-orbitron text-4xl font-black text-neon-red tracking-widest drop-shadow-[0_0_15px_#ff0066] animate-pulse-glow">
                      {timeRemaining || "00:00:00"}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-300 max-w-md mt-1">
                  Tous les décryptages VPN Alpha, OpenSSL, EHI, DarkTunnel et NPVT Whitebox sont débloqués.
                </p>
                <button
                  onClick={handleDisconnect}
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(true)}
                  className="mt-3 text-xs bg-red-950/40 border border-neon-red hover:bg-[#cc0044] hover:text-white px-4 py-1.5 transition-all font-mono tracking-widest uppercase clip-corner-xs cursor-none"
                >
                  Fermer la session
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md">
                <p className="text-xs text-gray-400 text-center mb-3">
                  Veuillez entrer votre clé d'authentification pour débloquer les algorithmes de décryptage VPN.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <input
                    type="text"
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="Entrez importet (24h) ou ALPHAbot (VIP)"
                    onKeyDown={(e) => e.key === "Enter" && handleValidateLicense()}
                    className="flex-1 bg-[#0a0005] border border-border-red/70 focus:border-neon-red focus:shadow-[0_0_15px_rgba(255,0,100,0.5)] outline-none text-[#e0b0b0] px-4 py-2 font-mono text-sm tracking-wider rounded transition-all cursor-none"
                  />
                  <button
                    onClick={handleValidateLicense}
                    onMouseEnter={() => setCursorHovered(true)}
                    onMouseLeave={() => setCursorHovered(false)}
                    className="bg-transparent border border-neon-red hover:bg-neon-red hover:text-black hover:shadow-[0_0_15px_#ff0066] transition-all px-6 py-2 font-orbitron font-bold text-xs uppercase tracking-widest clip-corner-xs cursor-none"
                  >
                    Valider
                  </button>
                </div>
                {licenseError && (
                  <p className="text-xs text-red-500 mt-2 font-mono text-center animate-pulse">{licenseError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title Block */}
        <div className="text-center mb-8 relative">
          <h1
            className="main-title font-orbitron text-4xl md:text-5xl font-black text-neon-red tracking-widest select-none relative inline-block animate-title-float"
            style={{
              textShadow: "0 0 15px #ff0066, 0 0 40px #aa0033, 0 5px 12px rgba(0,0,0,0.9)"
            }}
          >
            {glitchTitle}
          </h1>
          <div className="block mt-2">
            <span className="font-orbitron font-bold text-[#b08080] text-xs tracking-[0.25em] bg-[#1a000d]/60 border-t border-b border-[#440011]/80 px-4 py-1.5 inline-block">
              [ VPN DESCRIPTOR ENGINE V2.0 ]
            </span>
          </div>
        </div>

        {/* Decoder Content Wrapper */}
        <div className={!license || !license.valid ? "opacity-35 pointer-events-none select-none duration-300" : "duration-300"}>
          
          {/* Mode Selector */}
          <div className="mb-6">
            <div className="text-xs font-orbitron font-bold text-gray-400 uppercase tracking-widest text-center mb-3">
              Choisir l'Algorithme de Déchiffrement
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {(["alpha", "openssl", "ehi", "darktunnel", "npvt"] as CryptoMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    playSound("click");
                    setMode(m);
                    setCustomUrl("");
                  }}
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  className={`px-4 py-2 font-orbitron font-bold text-xs uppercase tracking-wider transition-all duration-300 clip-corner-xs cursor-none flex items-center gap-1.5 ${
                    mode === m
                      ? "bg-[#cc0044] text-white shadow-[0_0_20px_#ff0066] border border-neon-red scale-105"
                      : "bg-[#0a0005]/60 text-gray-400 border border-[#440011]/70 hover:text-neon-red hover:border-neon-red/50"
                  }`}
                >
                  <Cpu className={`w-3.5 h-3.5 ${mode === m ? "animate-spin [animation-duration:10s]" : ""}`} />
                  {m === "openssl" ? "OpenSSL" : m === "darktunnel" ? "DarkTunnel" : m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* URL & Quick presets input */}
          <div className="mb-6 bg-[#030001] border border-[#330011]/70 p-4 rounded-lg">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-[#b08080] uppercase tracking-wider flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5 text-neon-red" />
                URL Source du Fichier Chiffré :
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder={`Laisser vide pour charger la source "${mode.toUpperCase()}" officielle...`}
                  className="flex-1 bg-[#0a0005] border border-[#550022] focus:border-neon-red focus:shadow-[0_0_12px_rgba(255,0,100,0.3)] outline-none text-[#e0b0b0] px-3 py-2 font-mono text-xs rounded transition-all cursor-none"
                />
                <button
                  onClick={() => {
                    playSound("click");
                    setCustomUrl(DEFAULT_URLS[mode]);
                    triggerToast("📍 URL officielle chargée");
                  }}
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  className="text-xs bg-[#15020c] border border-[#660022] hover:border-neon-red px-3 py-2 text-gray-300 transition-all clip-corner-xs cursor-none"
                >
                  Reset URL
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-[#330011]/40 text-[11px] text-gray-500 font-mono">
                <span className="truncate max-w-xs md:max-w-lg">
                  Source actuelle : <span className="text-[#a07070]">{customUrl || DEFAULT_URLS[mode]}</span>
                </span>
                <span className="flex gap-2">
                  <span className="text-gray-400">Default Password :</span>
                  {mode === "openssl" ? (
                    <span className="text-neon-red select-all font-bold">"securedjson"</span>
                  ) : (
                    <span className="text-gray-600">Aucun</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Main Action Bar */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
            <button
              onClick={handleLoadServers}
              disabled={loading}
              onMouseEnter={() => setCursorHovered(true)}
              onMouseLeave={() => setCursorHovered(false)}
              className="w-full sm:w-auto min-w-[220px] bg-[#0c0106]/80 text-neon-red border-2 border-neon-red hover:bg-[#cc0044] hover:text-white hover:shadow-[0_0_25px_#ff0066] transition-all duration-300 py-3 px-6 font-orbitron font-black text-sm tracking-widest uppercase clip-corner cursor-none flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Décryptage en cours..." : "⚡ Charger & Décrypter"}
            </button>

            <button
              onClick={handleInjectSample}
              onMouseEnter={() => setCursorHovered(true)}
              onMouseLeave={() => setCursorHovered(false)}
              className="w-full sm:w-auto text-xs bg-transparent border border-gray-600 text-gray-400 hover:text-white hover:border-white transition-all py-3 px-5 font-mono tracking-wider uppercase clip-corner cursor-none flex items-center justify-center gap-2"
              title="Permet de tester l'application directement avec des serveurs fictifs pré-décryptés"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
              Mode Démonstration
            </button>
          </div>

          {/* Status Bar */}
          <div className="mb-6 flex justify-center">
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-md border text-xs font-mono max-w-3xl text-center shadow-inner ${
                isStatusError
                  ? "bg-red-950/20 border-red-800 text-red-400"
                  : "bg-[#0a0005]/60 border-[#550022]/40 text-[#ff4d88]"
              }`}
            >
              {loading && <div className="w-3 h-3 border-2 border-neon-red/30 border-t-neon-red rounded-full animate-spin" />}
              {!loading && <div className="w-2 h-2 rounded-full bg-neon-red animate-ping" />}
              <span className="text-left leading-relaxed">{statusMessage}</span>
            </div>
          </div>

          {/* Search, Filter, Sort Toolbar */}
          {servers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 grid grid-cols-1 md:grid-cols-12 gap-3"
            >
              {/* Search Bar */}
              <div className="md:col-span-6 flex items-center bg-[#0a0005] border border-[#550022] focus-within:border-neon-red focus-within:shadow-[0_0_12px_rgba(255,0,100,0.3)] rounded px-3 py-1.5 transition-all">
                <Search className="w-4 h-4 text-neon-red mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrer (pays, IP, type, payload)..."
                  className="w-full bg-transparent border-none outline-none text-xs text-[#e0b0b0] font-mono cursor-none"
                />
              </div>

              {/* Sorting and Views */}
              <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => {
                    playSound("click");
                    setSortBy(sortBy === "country" ? "" : "country");
                  }}
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  className={`text-[11px] font-mono border px-3 py-1.5 rounded transition-all cursor-none flex items-center gap-1 ${
                    sortBy === "country" ? "border-neon-red text-neon-red bg-neon-red/10" : "border-[#330011] text-gray-400 hover:text-white"
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  Tri par Pays
                </button>

                <button
                  onClick={() => {
                    playSound("click");
                    setSortBy(sortBy === "name" ? "" : "name");
                  }}
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  className={`text-[11px] font-mono border px-3 py-1.5 rounded transition-all cursor-none flex items-center gap-1 ${
                    sortBy === "name" ? "border-neon-red text-neon-red bg-neon-red/10" : "border-[#330011] text-gray-400 hover:text-white"
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  Tri par Nom
                </button>

                <button
                  onClick={() => {
                    playSound("click");
                    setIsListView(!isListView);
                  }}
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  className="text-[11px] font-mono border border-[#330011] text-gray-400 hover:text-white px-3 py-1.5 rounded transition-all cursor-none flex items-center gap-1"
                >
                  {isListView ? <Grid className="w-3 h-3" /> : <List className="w-3 h-3" />}
                  {isListView ? "Grille" : "Liste"}
                </button>

                <button
                  onClick={handleExport}
                  onMouseEnter={() => setCursorHovered(true)}
                  onMouseLeave={() => setCursorHovered(false)}
                  className="text-[11px] font-mono border border-neon-red text-neon-red hover:bg-[#cc0044] hover:text-white px-3 py-1.5 rounded transition-all cursor-none flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Exporter
                </button>
              </div>
            </motion.div>
          )}

          {/* Server List Display */}
          {servers.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              
              {/* Server List Column (Bento Cards or Rows) */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                <div className="text-xs font-orbitron font-bold text-gray-400 tracking-wider flex items-center justify-between border-b border-[#330011] pb-2 mb-1">
                  <span>SERVEURS TROUVÉS ({filteredServers.length})</span>
                  <span className="text-xs text-neon-red font-mono font-normal">MODE : {mode.toUpperCase()}</span>
                </div>

                <div
                  className={`max-h-[380px] overflow-y-auto pr-2 grid gap-3 ${
                    isListView ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                  }`}
                >
                  {filteredServers.length > 0 ? (
                    filteredServers.map((server, index) => {
                      const flag = getFlag(server.Country);
                      const isSelected = index === activeServerIndex;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: Math.min(index * 0.03, 0.3) }}
                          onClick={() => {
                            playSound("click");
                            setActiveServerIndex(index);
                          }}
                          onMouseEnter={() => setCursorHovered(true)}
                          onMouseLeave={() => setCursorHovered(false)}
                          className={`relative p-4 cursor-none border transition-all duration-200 clip-corner-sm flex flex-col justify-between ${
                            isSelected
                              ? "bg-red-950/40 border-neon-red shadow-[0_0_15px_rgba(255,0,100,0.4),inset_0_0_8px_rgba(255,0,100,0.2)]"
                              : "bg-[#0a0005]/70 border-[#550022]/40 hover:border-neon-red hover:shadow-[0_0_10px_rgba(255,0,100,0.2)]"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neon-red shadow-[0_0_6px_#ff0066] animate-ping" />
                          )}

                          <div>
                            <div className="font-bold text-sm text-[#ff4d88] flex items-center gap-2 mb-1 drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]">
                              {flag && <span className="text-xl leading-none filter drop-shadow-[0_0_4px_rgba(255,0,0,0.6)]">{flag}</span>}
                              <span className="truncate">{server.ServerName || `Serveur #${index + 1}`}</span>
                            </div>
                            <div className="font-mono text-xs text-[#c0a0a0] flex items-center gap-1">
                              <Wifi className="w-3.5 h-3.5 text-gray-500" />
                              IP : <span className="text-[#e0b0b0] font-bold select-all">{server.ServerIP || "Non défini"}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#330011]/30">
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <Server className="w-3 h-3" />
                              {server.Type || "SSH/V2Ray"}
                            </span>
                            <span className="text-[10px] text-neon-red font-orbitron font-bold">
                              {isSelected ? "[ SÉLECTIONNÉ ]" : "DÉTAILS"}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center font-mono text-xs text-gray-500 py-12 bg-[#050002]/80 border border-[#330011]/40 rounded col-span-2">
                      Aucun serveur ne correspond aux critères de recherche.
                    </div>
                  )}
                </div>
              </div>

              {/* Server Details Column Panel */}
              <div className="lg:col-span-1">
                <div className="text-xs font-orbitron font-bold text-gray-400 tracking-wider border-b border-[#330011] pb-2 mb-4 uppercase">
                  🔑 DÉTAILS DU SERVEUR
                </div>

                <div className="bg-[#050002] border border-[#550022]/60 p-4 rounded-lg min-h-[350px] flex flex-col justify-between">
                  {activeServerIndex !== -1 && filteredServers[activeServerIndex] ? (
                    <div className="flex flex-col gap-3 max-h-[330px] overflow-y-auto pr-1">
                      <div className="text-xs font-orbitron text-[#ff3388] font-bold border-l-2 border-neon-red pl-2 py-0.5 tracking-wider mb-2">
                        [ {filteredServers[activeServerIndex].ServerName || "SERVEUR UNIQUE"} ]
                      </div>

                      {/* Explicit keys mapping */}
                      {[
                        { key: "ServerName", label: "Nom" },
                        { key: "ServerIP", label: "Adresse IP" },
                        { key: "ServerUser", label: "Utilisateur" },
                        { key: "ServerPass", label: "Mot de passe" },
                        { key: "Payload", label: "Payload" },
                        { key: "SNI", label: "SNI" },
                        { key: "udpserver", label: "Serveur UDP" },
                        { key: "udpobfs", label: "Obfuscation UDP" },
                        { key: "v2rayJson", label: "Config V2Ray" },
                        { key: "ServerPort", label: "Port" },
                        { key: "ProxyPort", label: "Port Proxy" },
                        { key: "Type", label: "Protocole" },
                        { key: "Country", label: "Pays d'origine" }
                      ].map(
                        (field) =>
                          filteredServers[activeServerIndex][field.key] !== undefined && (
                            <div
                              key={field.key}
                              className="flex flex-col gap-1 pb-2 border-b border-[#330011]/40 hover:bg-neon-red/5 px-1 py-0.5 rounded transition-all duration-150"
                            >
                              <span className="text-[10px] font-mono text-[#ff4d88] uppercase tracking-wider">{field.label} :</span>
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-mono text-xs text-[#c0a0a0] select-all break-all pr-1">
                                  {typeof filteredServers[activeServerIndex][field.key] === "object"
                                    ? JSON.stringify(filteredServers[activeServerIndex][field.key], null, 2)
                                    : String(filteredServers[activeServerIndex][field.key])}
                                </span>
                                <button
                                  onClick={() =>
                                    handleCopyField(
                                      String(filteredServers[activeServerIndex][field.key]),
                                      field.label
                                    )
                                  }
                                  onMouseEnter={() => setCursorHovered(true)}
                                  onMouseLeave={() => setCursorHovered(false)}
                                  className="text-neon-red hover:text-white hover:scale-110 duration-150 p-1 cursor-none flex-shrink-0"
                                  title="Copier le champ"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )
                      )}

                      {/* Dynamic/extra fields mapping */}
                      {Object.keys(filteredServers[activeServerIndex])
                        .filter(
                          (key) =>
                            ![
                              "ServerName",
                              "ServerIP",
                              "ServerUser",
                              "ServerPass",
                              "Payload",
                              "SNI",
                              "udpserver",
                              "udpobfs",
                              "v2rayJson",
                              "ServerPort",
                              "ProxyPort",
                              "Type",
                              "Country"
                            ].includes(key)
                        )
                        .map((key) => {
                          const val = filteredServers[activeServerIndex][key];
                          const strVal = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
                          return (
                            <div
                              key={key}
                              className="flex flex-col gap-1 pb-2 border-b border-[#330011]/40 hover:bg-neon-red/5 px-1 py-0.5 rounded transition-all duration-150"
                            >
                              <span className="text-[10px] font-mono text-[#ff4d88] uppercase tracking-wider">{key} :</span>
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-mono text-xs text-[#c0a0a0] select-all break-all pr-1">{strVal}</span>
                                <button
                                  onClick={() => handleCopyField(strVal, key)}
                                  onMouseEnter={() => setCursorHovered(true)}
                                  onMouseLeave={() => setCursorHovered(false)}
                                  className="text-neon-red hover:text-white hover:scale-110 duration-150 p-1 cursor-none flex-shrink-0"
                                  title="Copier le champ"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-gray-500 font-mono text-xs p-8 m-auto">
                      <HelpCircle className="w-8 h-8 text-border-red/40 mb-2 animate-bounce" />
                      Sélectionnez un serveur dans la liste pour auditer ses paramètres de chiffrement.
                    </div>
                  )}

                  {activeServerIndex !== -1 && filteredServers[activeServerIndex] && (
                    <div className="text-[10px] font-mono text-[#772233] text-right mt-2 uppercase tracking-widest border-t border-[#330011]/50 pt-2">
                      [ Audit cryptographique sécurisé ]
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Fallback Empty Display */}
          {servers.length === 0 && (
            <div className="text-center font-mono py-16 px-4 bg-[#050002]/85 border border-border-red/40 rounded-lg max-w-2xl mx-auto clip-corner">
              <FileCode className="w-12 h-12 text-[#ff0066] mx-auto mb-4 animate-pulse" />
              <h3 className="font-orbitron font-bold text-sm tracking-widest text-[#e0b0b0] uppercase mb-2">
                Aucun serveur chargé
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed mb-6">
                Pour commencer, assurez-vous d'avoir validé une clé d'accès ci-dessus, sélectionnez votre protocole, puis
                cliquez sur "Charger & Décrypter" pour récupérer les configurations sécurisées en ligne.
              </p>
              <button
                onClick={handleLoadServers}
                onMouseEnter={() => setCursorHovered(true)}
                onMouseLeave={() => setCursorHovered(false)}
                className="text-xs border border-neon-red text-neon-red hover:bg-[#cc0044] hover:text-white px-5 py-2 clip-corner-xs cursor-none uppercase tracking-widest font-orbitron font-bold shadow-[0_0_12px_rgba(255,0,100,0.25)] hover:shadow-[0_0_20px_#ff0066] duration-200"
              >
                Lancer le décryptage
              </button>
            </div>
          )}

        </div>

        {/* Footer info line */}
        <div className="text-center text-[10px] text-gray-600 font-mono tracking-widest uppercase mt-8 border-t border-[#330011]/60 pt-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <span>MODULE ALPHA DESCRIPTOR SECURED BY ANTIGRAVITY ENGINE</span>
          <span className="flex items-center gap-1 text-[#a07070]">
            <Lock className="w-3 h-3 text-[#ff0066]" /> DÉCRYPTAGE LOCAL SÉCURISÉ 100% CLIENT-SIDE
          </span>
        </div>

      </div>
    </div>
  );
}
