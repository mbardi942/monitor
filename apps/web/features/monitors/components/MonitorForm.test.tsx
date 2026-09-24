// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonitorForm } from "./MonitorForm";
import { createMonitorAction } from "../actions/monitor-actions";

// Mock di Server Actions
vi.mock("../actions/monitor-actions", () => ({
  createMonitorAction: vi.fn(),
  updateMonitorAction: vi.fn(),
}));

// Mock del Toast
const mockShowToast = vi.fn();
vi.mock("@/shared/components/Toast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock di DashboardContext
vi.mock("@/features/dashboard/context/DashboardContext", () => ({
  useDashboard: () => ({
    recipients: [],
  }),
}));

describe("MonitorForm", () => {
  const defaultProps = {
    dashboardId: "dash-123",
    onBack: vi.fn(),
    onSaved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders default fields for a new HTTP monitor", () => {
    render(<MonitorForm {...defaultProps} />);
    
    expect(screen.getByPlaceholderText("es. Sito Web Principale")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://tuo-sito.com/api/health")).toBeInTheDocument();
    
    // I campi PING come host e port non devono essere visibili all'inizio
    expect(screen.queryByPlaceholderText("db.replica.local")).not.toBeInTheDocument();
  });

  it("switches displayed fields when monitor type is changed to PING", async () => {
    const user = userEvent.setup();
    render(<MonitorForm {...defaultProps} />);
    
    // Clicca sul pulsante PING del tipo monitor
    const pingButton = screen.getByText("PING/TCP");
    await user.click(pingButton);
    
    // Ora l'input host deve essere presente
    expect(screen.getByPlaceholderText("db.replica.local")).toBeInTheDocument();
    
    // E l'input URL non deve più esserci
    expect(screen.queryByPlaceholderText("https://tuo-sito.com/api/health")).not.toBeInTheDocument();
  });

  it("calls createMonitorAction on successful submit", async () => {
    const user = userEvent.setup();
    vi.mocked(createMonitorAction).mockResolvedValue({ id: "mon-1" } as any);
    
    render(<MonitorForm {...defaultProps} />);
    
    // Compila il nome
    const nameInput = screen.getByPlaceholderText("es. Sito Web Principale");
    await user.type(nameInput, "Monitor Test");
    
    // Compila l'URL
    const urlInput = screen.getByPlaceholderText("https://tuo-sito.com/api/health");
    await user.clear(urlInput);
    await user.type(urlInput, "https://google.com");
    
    // Invia il form
    const submitBtn = screen.getByRole("button", { name: "Salva Monitor" });
    await user.click(submitBtn);
    
    expect(createMonitorAction).toHaveBeenCalledTimes(1);
    expect(createMonitorAction).toHaveBeenCalledWith("dash-123", expect.objectContaining({
      name: "Monitor Test",
      type: "HTTP",
      probeConfiguration: expect.objectContaining({
        url: "https://google.com",
      }),
    }));
    
    expect(mockShowToast).toHaveBeenCalledWith("Monitor creato con successo.", "success");
    expect(defaultProps.onSaved).toHaveBeenCalledTimes(1);
  });

  it("allows navigation across the 4 tabs (Target, Uptime Criteria, Data Extraction, Notifications)", async () => {
    const user = userEvent.setup();
    render(<MonitorForm {...defaultProps} />);

    // Inizialmente siamo nella tab Target & Rete
    expect(screen.getByPlaceholderText("es. Sito Web Principale")).toBeInTheDocument();

    // Naviga a Criteri Uptime
    const uptimeTab = screen.getByRole("button", { name: /Criteri Uptime/i });
    await user.click(uptimeTab);
    expect(screen.getByText("Regole di Validazione (Assert)")).toBeInTheDocument();
    expect(screen.getByText("Politica di Scatto Allarme")).toBeInTheDocument();

    // Naviga a Estrazione Dati
    const extractionTab = screen.getByRole("button", { name: /Estrazione Dati/i });
    await user.click(extractionTab);
    expect(screen.getByText("Abilita Estrazione Dati")).toBeInTheDocument();

    // Naviga a Notifiche
    const notificationsTab = screen.getByRole("button", { name: /Notifiche/i });
    await user.click(notificationsTab);
    expect(screen.getByText("Destinatari Notifiche Allarmi")).toBeInTheDocument();
  });

  it("supports adding custom headers and includes them in the payload", async () => {
    const user = userEvent.setup();
    vi.mocked(createMonitorAction).mockResolvedValue({ id: "mon-1" } as any);

    render(<MonitorForm {...defaultProps} />);

    // Compila nome e URL
    await user.type(screen.getByPlaceholderText("es. Sito Web Principale"), "API Protetta");
    const urlInput = screen.getByPlaceholderText("https://tuo-sito.com/api/health");
    await user.clear(urlInput);
    await user.type(urlInput, "https://api.example.com/data");

    // Clicca sul preset "+ JSON Content-Type"
    const jsonPresetBtn = screen.getByRole("button", { name: "+ JSON Content-Type" });
    await user.click(jsonPresetBtn);

    // Clicca sul preset "+ Bearer Token"
    const bearerPresetBtn = screen.getByRole("button", { name: "+ Bearer Token" });
    await user.click(bearerPresetBtn);

    // Trova gli input del token e completa il valore
    const valueInputs = screen.getAllByPlaceholderText(/Valore/i);
    await user.type(valueInputs[1], "my-secret-jwt");

    // Salva il monitor
    const submitBtn = screen.getByRole("button", { name: "Salva Monitor" });
    await user.click(submitBtn);

    expect(createMonitorAction).toHaveBeenCalledTimes(1);
    expect(createMonitorAction).toHaveBeenCalledWith(
      "dash-123",
      expect.objectContaining({
        name: "API Protetta",
        type: "HTTP",
        probeConfiguration: expect.objectContaining({
          url: "https://api.example.com/data",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer my-secret-jwt",
          },
        }),
      })
    );
  });

  it("shows Request Body field for POST method and includes it in the payload", async () => {
    const user = userEvent.setup();
    vi.mocked(createMonitorAction).mockResolvedValue({ id: "mon-2" } as any);

    render(<MonitorForm {...defaultProps} />);

    // Compila nome e URL
    await user.type(screen.getByPlaceholderText("es. Sito Web Principale"), "Webhook POST");
    const urlInput = screen.getByPlaceholderText("https://tuo-sito.com/api/health");
    await user.clear(urlInput);
    await user.type(urlInput, "https://api.example.com/webhook");

    // Seleziona metodo POST
    const postBtn = screen.getByText("POST");
    await user.click(postBtn);

    // Il campo request body deve essere visibile
    const bodyInput = screen.getByPlaceholderText(/healthcheck/i);
    expect(bodyInput).toBeInTheDocument();
    fireEvent.change(bodyInput, { target: { value: '{"status":"ok"}' } });

    // Salva il monitor
    const submitBtn = screen.getByRole("button", { name: "Salva Monitor" });
    await user.click(submitBtn);


    expect(createMonitorAction).toHaveBeenCalledTimes(1);
    expect(createMonitorAction).toHaveBeenCalledWith(
      "dash-123",
      expect.objectContaining({
        name: "Webhook POST",
        type: "HTTP",
        probeConfiguration: expect.objectContaining({
          url: "https://api.example.com/webhook",
          method: "POST",
          body: '{"status":"ok"}',
        }),
      })
    );
  });

  it("supports configuring a HEARTBEAT monitor and generating integration snippets", async () => {
    const user = userEvent.setup();
    vi.mocked(createMonitorAction).mockResolvedValue({ id: "mon-hb" } as any);

    render(<MonitorForm {...defaultProps} />);

    // Seleziona il tipo Heartbeat (Push)
    const hbBtn = screen.getByText("Heartbeat (Push)");
    await user.click(hbBtn);

    // Verifica che i controlli Heartbeat siano visualizzati
    expect(screen.getByText(/Parametri di Ascolto Heartbeat/i)).toBeInTheDocument();
    expect(screen.getByText(/Snippet Pronti per l'Integrazione/i)).toBeInTheDocument();
    expect(screen.getByText(/PowerShell \(Windows\)/i)).toBeInTheDocument();

    // Compila nome
    await user.type(screen.getByPlaceholderText("es. Sito Web Principale"), "Backup Windows Server");

    // Salva il monitor
    const submitBtn = screen.getByRole("button", { name: "Salva Monitor" });
    await user.click(submitBtn);

    expect(createMonitorAction).toHaveBeenCalledTimes(1);
    expect(createMonitorAction).toHaveBeenCalledWith(
      "dash-123",
      expect.objectContaining({
        name: "Backup Windows Server",
        type: "HEARTBEAT",
        probeConfiguration: expect.objectContaining({
          heartbeatToken: expect.stringMatching(/^hb_sec_/),
          expectedIntervalSeconds: 3600,
          gracePeriodSeconds: 300,
        }),
      })
    );
  });

  it("blocks submit and shows warning toast if required fields are missing even from another tab", async () => {
    const user = userEvent.setup();
    render(<MonitorForm {...defaultProps} />);

    // Passa alla tab Notifiche lasciando il nome vuoto
    const notificheTab = screen.getByRole("button", { name: /Notifiche/i });
    await user.click(notificheTab);

    // Tenta di salvare
    const submitBtn = screen.getByRole("button", { name: "Salva Monitor" });
    await user.click(submitBtn);

    // Non deve chiamare l'action e deve mostrare il toast
    expect(createMonitorAction).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith("Inserisci un nome descrittivo per il monitor.", "warning");
  });

  it("shows an error toast when attempting to format invalid JSON", async () => {
    const user = userEvent.setup();
    render(<MonitorForm {...defaultProps} />);

    // Seleziona metodo POST
    const postBtn = screen.getByText("POST");
    await user.click(postBtn);

    // Inserisce JSON non valido nel body
    const bodyInput = screen.getByPlaceholderText(/healthcheck/i);
    fireEvent.change(bodyInput, { target: { value: '{ test: "manca_chiusura"' } });

    // Clicca Formatta JSON
    const formatBtn = screen.getByRole("button", { name: /Formatta JSON/i });
    await user.click(formatBtn);

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining("Il testo non è un JSON valido"),
      "error"
    );
  });
});


