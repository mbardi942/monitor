"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  Layers,
  Plus,
  Trash2,
  Lock,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AuthProfileType, AuthProfileDTO } from "@monitor/monitoring";
import { useToast } from "@/shared/components/Toast";
import { testCredentialLoginAction } from "../actions/credential-actions";

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: AuthProfileType;
    data: Record<string, any>;
  }) => Promise<void>;
  editingCredential?: AuthProfileDTO | null;
}

export const CredentialModal: React.FC<CredentialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCredential,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<AuthProfileType>("BEARER");
  const [isSaving, setIsSaving] = useState(false);

  // Campi specifici per tipo
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const [headerName, setHeaderName] = useState("X-API-Key");
  const [headerValue, setHeaderValue] = useState("");
  const [showHeaderValue, setShowHeaderValue] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);

  // Campi OAuth2 Client Credentials
  const [oauthTokenUrl, setOauthTokenUrl] = useState("");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [showOauthSecret, setShowOauthSecret] = useState(false);
  const [oauthScope, setOauthScope] = useState("");

  // Campi Dynamic Login
  const [dynamicLoginUrl, setDynamicLoginUrl] = useState("");
  const [dynamicMethod, setDynamicMethod] = useState<"POST" | "GET">("POST");
  const [dynamicBody, setDynamicBody] = useState("");
  const [dynamicTokenPath, setDynamicTokenPath] = useState("access_token");
  const [dynamicExpiresInPath, setDynamicExpiresInPath] = useState("expires_in");
  const [dynamicFallbackTtl, setDynamicFallbackTtl] = useState("3600");
  const [dynamicTargetHeader, setDynamicTargetHeader] = useState("Authorization");
  const [dynamicHeaderPrefix, setDynamicHeaderPrefix] = useState("Bearer ");

  // Stato per il test di login
  const [isTestingLogin, setIsTestingLogin] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status?: number;
    tokenPreview?: string;
    expiresInSeconds?: number;
    headers?: Record<string, string>;
    error?: string;
  } | null>(null);

  useEffect(() => {
    setTestResult(null);
    if (editingCredential) {
      setName(editingCredential.name);
      setType(editingCredential.type);
      const d = editingCredential.maskedData || {};
      if (editingCredential.type === "BEARER") {
        setToken(d.token || "");
      } else if (editingCredential.type === "API_KEY") {
        setHeaderName(d.headerName || "X-API-Key");
        setHeaderValue(d.headerValue || "");
      } else if (editingCredential.type === "BASIC_AUTH") {
        setUsername(d.username || "");
        setPassword(d.password || "");
      } else if (editingCredential.type === "CUSTOM_HEADERS" && d.headers) {
        setCustomHeaders(
          Object.entries(d.headers).map(([k, v]) => ({ key: k, value: String(v) }))
        );
      } else if (editingCredential.type === "OAUTH2_CLIENT_CREDENTIALS") {
        setOauthTokenUrl(d.tokenUrl || "");
        setOauthClientId(d.clientId || "");
        setOauthClientSecret(d.clientSecret || "");
        setOauthScope(d.scope || "");
      } else if (editingCredential.type === "DYNAMIC_LOGIN") {
        setDynamicLoginUrl(d.loginUrl || "");
        setDynamicMethod(d.method || "POST");
        setDynamicBody(
          typeof d.body === "string" ? d.body : d.body ? JSON.stringify(d.body, null, 2) : ""
        );
        setDynamicTokenPath(d.tokenPath || "access_token");
        setDynamicExpiresInPath(d.expiresInPath || "expires_in");
        setDynamicFallbackTtl(String(d.fallbackTtlSeconds || "3600"));
        setDynamicTargetHeader(d.targetHeaderName || "Authorization");
        setDynamicHeaderPrefix(d.targetHeaderPrefix !== undefined ? d.targetHeaderPrefix : "Bearer ");
      }
    } else {
      setName("");
      setType("BEARER");
      setToken("");
      setHeaderName("X-API-Key");
      setHeaderValue("");
      setUsername("");
      setPassword("");
      setCustomHeaders([{ key: "", value: "" }]);
      setOauthTokenUrl("");
      setOauthClientId("");
      setOauthClientSecret("");
      setOauthScope("");
      setDynamicLoginUrl("");
      setDynamicMethod("POST");
      setDynamicBody('{\n  "username": "user@example.com",\n  "password": "password123"\n}');
      setDynamicTokenPath("access_token");
      setDynamicExpiresInPath("expires_in");
      setDynamicFallbackTtl("3600");
      setDynamicTargetHeader("Authorization");
      setDynamicHeaderPrefix("Bearer ");
    }
    setShowToken(false);
    setShowHeaderValue(false);
    setShowPassword(false);
    setShowOauthSecret(false);
  }, [editingCredential, isOpen]);

  if (!isOpen) return null;

  const getPayloadData = (): Record<string, any> | null => {
    let payloadData: Record<string, any> = {};

    if (type === "BEARER") {
      if (!token.trim()) {
        showToast("Il token Bearer non può essere vuoto.", "warning");
        return null;
      }
      payloadData = { token: token.trim() };
    } else if (type === "API_KEY") {
      if (!headerValue.trim()) {
        showToast("Il valore della chiave API non può essere vuoto.", "warning");
        return null;
      }
      payloadData = {
        headerName: headerName.trim() || "X-API-Key",
        headerValue: headerValue.trim(),
      };
    } else if (type === "BASIC_AUTH") {
      if (!username.trim() || !password.trim()) {
        showToast("Inserisci sia il nome utente che la password per Basic Auth.", "warning");
        return null;
      }
      payloadData = { username: username.trim(), password: password.trim() };
    } else if (type === "CUSTOM_HEADERS") {
      const hdrs: Record<string, string> = {};
      for (const h of customHeaders) {
        if (h.key.trim()) {
          hdrs[h.key.trim()] = h.value;
        }
      }
      if (Object.keys(hdrs).length === 0) {
        showToast("Aggiungi almeno un header personalizzato.", "warning");
        return null;
      }
      payloadData = { headers: hdrs };
    } else if (type === "OAUTH2_CLIENT_CREDENTIALS") {
      if (!oauthTokenUrl.trim()) {
        showToast("Il Token URL di OAuth2 è obbligatorio.", "warning");
        return null;
      }
      if (!oauthClientId.trim() || !oauthClientSecret.trim()) {
        showToast("Client ID e Client Secret sono obbligatori per OAuth2.", "warning");
        return null;
      }
      payloadData = {
        tokenUrl: oauthTokenUrl.trim(),
        clientId: oauthClientId.trim(),
        clientSecret: oauthClientSecret.trim(),
        scope: oauthScope.trim() || undefined,
        targetHeaderName: "Authorization",
        targetHeaderPrefix: "Bearer ",
      };
    } else if (type === "DYNAMIC_LOGIN") {
      if (!dynamicLoginUrl.trim()) {
        showToast("L'URL dell'endpoint di login è obbligatorio.", "warning");
        return null;
      }
      if (!dynamicTokenPath.trim()) {
        showToast("Il JSON Path per estrarre il token è obbligatorio.", "warning");
        return null;
      }
      payloadData = {
        loginUrl: dynamicLoginUrl.trim(),
        method: dynamicMethod,
        body: dynamicBody.trim() || undefined,
        tokenPath: dynamicTokenPath.trim(),
        expiresInPath: dynamicExpiresInPath.trim() || undefined,
        fallbackTtlSeconds: Number(dynamicFallbackTtl) > 0 ? Number(dynamicFallbackTtl) : 3600,
        targetHeaderName: dynamicTargetHeader.trim() || "Authorization",
        targetHeaderPrefix: dynamicHeaderPrefix,
      };
    }

    return payloadData;
  };

  const handleTestLogin = async () => {
    const payload = getPayloadData();
    if (!payload) return;

    setIsTestingLogin(true);
    setTestResult(null);
    try {
      const result = await testCredentialLoginAction({
        id: editingCredential?.id,
        name: name.trim() || "Test Profile",
        type,
        data: payload,
      });
      setTestResult(result);
      if (result.success) {
        showToast("Login eseguito con successo e token estratto!", "success");
      } else {
        showToast(`Test fallito: ${result.error || "Errore sconosciuto"}`, "error");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || "Errore durante il test di login.",
      });
      showToast("Errore di rete durante il test di login.", "error");
    } finally {
      setIsTestingLogin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Il nome del profilo di autenticazione è obbligatorio.", "warning");
      return;
    }

    const payloadData = getPayloadData();
    if (!payloadData) return;

    try {
      setIsSaving(true);
      await onSave({ name: name.trim(), type, data: payloadData });
      showToast(
        editingCredential
          ? "Credenziale aggiornata con successo."
          : "Nuova credenziale creata con successo.",
        "success"
      );
      onClose();
    } catch (err: any) {
      showToast(err.message || "Errore durante il salvataggio.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomHeader = () => {
    setCustomHeaders([...customHeaders, { key: "", value: "" }]);
  };

  const handleRemoveCustomHeader = (idx: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== idx));
  };

  const handleCustomHeaderChange = (idx: number, field: "key" | "value", val: string) => {
    const updated = [...customHeaders];
    updated[idx][field] = val;
    setCustomHeaders(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-neutral-800 shadow-2xl relative">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80 bg-neutral-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.15)] border border-[hsl(var(--primary)/0.3)] flex items-center justify-center text-[hsl(var(--primary))]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editingCredential ? "Modifica Profilo di Autenticazione" : "Nuovo Profilo di Autenticazione"}
              </h2>
              <p className="text-xs text-neutral-400">
                Salva token, credenziali statiche o flussi di login dinamici per riutilizzarli sui monitor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body con Scroll */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Nome Profilo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Nome del Profilo <span className="text-[hsl(var(--error))]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. API Produzione SAP, Stripe Live Key, OAuth2 Keycloak"
              className="input-text text-sm"
              required
            />
          </div>

          {/* Tipo di Autenticazione */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-neutral-300">
              Tipo di Autenticazione
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType("BEARER")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                  type === "BEARER"
                    ? "bg-[hsl(var(--primary)/0.15)] border-[hsl(var(--primary))] text-white shadow-sm"
                    : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Bearer Token</span>
              </button>

              <button
                type="button"
                onClick={() => setType("API_KEY")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                  type === "API_KEY"
                    ? "bg-[hsl(var(--primary)/0.15)] border-[hsl(var(--primary))] text-white shadow-sm"
                    : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>API Key</span>
              </button>

              <button
                type="button"
                onClick={() => setType("BASIC_AUTH")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                  type === "BASIC_AUTH"
                    ? "bg-[hsl(var(--primary)/0.15)] border-[hsl(var(--primary))] text-white shadow-sm"
                    : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Basic Auth</span>
              </button>

              <button
                type="button"
                onClick={() => setType("CUSTOM_HEADERS")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                  type === "CUSTOM_HEADERS"
                    ? "bg-[hsl(var(--primary)/0.15)] border-[hsl(var(--primary))] text-white shadow-sm"
                    : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Custom Set</span>
              </button>

              <button
                type="button"
                onClick={() => setType("OAUTH2_CLIENT_CREDENTIALS")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                  type === "OAUTH2_CLIENT_CREDENTIALS"
                    ? "bg-purple-500/15 border-purple-500 text-white shadow-sm"
                    : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                }`}
              >
                <Lock className="w-4 h-4 text-purple-400" />
                <span>OAuth2 Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => setType("DYNAMIC_LOGIN")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                  type === "DYNAMIC_LOGIN"
                    ? "bg-amber-500/15 border-amber-500 text-white shadow-sm"
                    : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                }`}
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Dynamic Login</span>
              </button>
            </div>
          </div>

          {/* Sezione Dinamica Campi per Tipo */}
          <div className="bg-neutral-900/70 p-4 rounded-lg border border-neutral-800/90 flex flex-col gap-4">
            {type === "BEARER" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Bearer Token <span className="text-[hsl(var(--error))]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="es. eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="input-text text-sm pr-10 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Verrà iniettato come header <code className="text-neutral-400">Authorization: Bearer &lt;token&gt;</code>.
                </p>
              </div>
            )}

            {type === "API_KEY" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Nome Header HTTP
                  </label>
                  <input
                    type="text"
                    value={headerName}
                    onChange={(e) => setHeaderName(e.target.value)}
                    placeholder="X-API-Key, api-token, x-auth-token"
                    className="input-text text-sm font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Valore Chiave API <span className="text-[hsl(var(--error))]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showHeaderValue ? "text" : "password"}
                      value={headerValue}
                      onChange={(e) => setHeaderValue(e.target.value)}
                      placeholder="es. sk_live_••••••••"
                      className="input-text text-sm pr-10 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowHeaderValue(!showHeaderValue)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      {showHeaderValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {type === "BASIC_AUTH" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Nome Utente (Username) <span className="text-[hsl(var(--error))]">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="input-text text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Password <span className="text-[hsl(var(--error))]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-text text-sm pr-10 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Credenziali codificate in Base64 e iniettate come <code className="text-neutral-400">Authorization: Basic ...</code>.
                </p>
              </div>
            )}

            {type === "CUSTOM_HEADERS" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">
                    Header Personalizzati (Coppie Chiave-Valore)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomHeader}
                    className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Aggiungi Riga
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {customHeaders.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={h.key}
                        onChange={(e) => handleCustomHeaderChange(i, "key", e.target.value)}
                        placeholder="Header (es. X-Tenant-Id)"
                        className="input-text text-xs flex-1 font-mono"
                      />
                      <input
                        type="text"
                        value={h.value}
                        onChange={(e) => handleCustomHeaderChange(i, "value", e.target.value)}
                        placeholder="Valore"
                        className="input-text text-xs flex-1 font-mono"
                      />
                      {customHeaders.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomHeader(i)}
                          className="text-neutral-500 hover:text-[hsl(var(--error))] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {type === "OAUTH2_CLIENT_CREDENTIALS" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Token URL (Endpoint OAuth2) <span className="text-[hsl(var(--error))]">*</span>
                  </label>
                  <input
                    type="url"
                    value={oauthTokenUrl}
                    onChange={(e) => setOauthTokenUrl(e.target.value)}
                    placeholder="https://auth.company.com/oauth/v2/token"
                    className="input-text text-xs font-mono"
                    required
                  />
                  <p className="text-[11px] text-neutral-500">
                    Verrà eseguita una chiamata <code className="text-neutral-400">POST</code> con <code className="text-neutral-400">grant_type=client_credentials</code>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Client ID <span className="text-[hsl(var(--error))]">*</span>
                    </label>
                    <input
                      type="text"
                      value={oauthClientId}
                      onChange={(e) => setOauthClientId(e.target.value)}
                      placeholder="es. my-monitoring-client"
                      className="input-text text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Client Secret <span className="text-[hsl(var(--error))]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showOauthSecret ? "text" : "password"}
                        value={oauthClientSecret}
                        onChange={(e) => setOauthClientSecret(e.target.value)}
                        placeholder="••••••••"
                        className="input-text text-xs pr-10 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowOauthSecret(!showOauthSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                      >
                        {showOauthSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Scope (Opzionale)
                  </label>
                  <input
                    type="text"
                    value={oauthScope}
                    onChange={(e) => setOauthScope(e.target.value)}
                    placeholder="read:monitors api:admin"
                    className="input-text text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {type === "DYNAMIC_LOGIN" && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-1 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Metodo
                    </label>
                    <select
                      value={dynamicMethod}
                      onChange={(e) => setDynamicMethod(e.target.value as "POST" | "GET")}
                      className="input-select text-xs font-mono"
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Login URL Endpoint <span className="text-[hsl(var(--error))]">*</span>
                    </label>
                    <input
                      type="url"
                      value={dynamicLoginUrl}
                      onChange={(e) => setDynamicLoginUrl(e.target.value)}
                      placeholder="https://api.company.com/v1/auth/login"
                      className="input-text text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Request Body (JSON Payload con credenziali)
                  </label>
                  <textarea
                    rows={4}
                    value={dynamicBody}
                    onChange={(e) => setDynamicBody(e.target.value)}
                    placeholder={'{\n  "username": "admin",\n  "password": "secret_password"\n}'}
                    className="input-text text-xs font-mono resize-y"
                  />
                  <p className="text-[11px] text-neutral-500">
                    I valori sensibili verranno automaticamente protetti con crittografia AES-256-GCM nel database.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      JSON Path Token <span className="text-[hsl(var(--error))]">*</span>
                    </label>
                    <input
                      type="text"
                      value={dynamicTokenPath}
                      onChange={(e) => setDynamicTokenPath(e.target.value)}
                      placeholder="access_token o data.jwt"
                      className="input-text text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      JSON Path Scadenza
                    </label>
                    <input
                      type="text"
                      value={dynamicExpiresInPath}
                      onChange={(e) => setDynamicExpiresInPath(e.target.value)}
                      placeholder="expires_in"
                      className="input-text text-xs font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Fallback TTL (sec)
                    </label>
                    <input
                      type="number"
                      value={dynamicFallbackTtl}
                      onChange={(e) => setDynamicFallbackTtl(e.target.value)}
                      placeholder="3600"
                      className="input-text text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Nome Header di Iniezione
                    </label>
                    <input
                      type="text"
                      value={dynamicTargetHeader}
                      onChange={(e) => setDynamicTargetHeader(e.target.value)}
                      placeholder="Authorization o X-Session-Token"
                      className="input-text text-xs font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Prefisso Valore Header
                    </label>
                    <input
                      type="text"
                      value={dynamicHeaderPrefix}
                      onChange={(e) => setDynamicHeaderPrefix(e.target.value)}
                      placeholder="Bearer (lascia vuoto per token nudo)"
                      className="input-text text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sezione Collaudo Immediato per profili dinamici */}
          {(type === "OAUTH2_CLIENT_CREDENTIALS" || type === "DYNAMIC_LOGIN") && (
            <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900/40 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Collaudo Immediato Flusso di Autenticazione
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Esegui una chiamata di login immediata per validare le credenziali ed estrarre il token
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestLogin}
                  disabled={isTestingLogin}
                  className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                >
                  {isTestingLogin ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Esecuzione...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Test Login
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-md text-xs border flex flex-col gap-1.5 ${
                    testResult.success
                      ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-300"
                      : "bg-rose-950/30 border-rose-800/50 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {testResult.success ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Autenticazione riuscita (HTTP {testResult.status || 200})</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Fallimento autenticazione {testResult.status ? `(HTTP ${testResult.status})` : ""}</span>
                      </>
                    )}
                  </div>

                  {testResult.success && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 text-[11px] font-mono text-neutral-300">
                      <div>
                        <span className="text-neutral-500">Token Estratto: </span>
                        <span className="text-emerald-400">{testResult.tokenPreview}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Validità Rilevata: </span>
                        <span>{testResult.expiresInSeconds ? `${testResult.expiresInSeconds}s (${Math.round(testResult.expiresInSeconds / 60)} min)` : "N/D"}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-neutral-500">Header Risultante: </span>
                        <span>{JSON.stringify(testResult.headers)}</span>
                      </div>
                    </div>
                  )}

                  {!testResult.success && testResult.error && (
                    <p className="text-[11px] text-rose-300 mt-1">{testResult.error}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn-secondary"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? "Salvataggio..." : editingCredential ? "Salva Modifiche" : "Crea Credenziale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
