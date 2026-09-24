// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  let mockOnConfirm: any;
  let mockOnCancel: any;

  beforeEach(() => {
    mockOnConfirm = vi.fn();
    mockOnCancel = vi.fn();
  });

  it("renders correctly when isOpen is true", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Titolo Test"
        message="Messaggio di test del dialogo"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText("Titolo Test")).toBeInTheDocument();
    expect(screen.getByText("Messaggio di test del dialogo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conferma" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annulla" })).toBeInTheDocument();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Titolo Test"
        message="Messaggio di test del dialogo"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onCancel when pressing the close or Cancel button", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Titolo Test"
        message="Messaggio di test del dialogo"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    // Clicca annulla
    await user.click(screen.getByRole("button", { name: "Annulla" }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);

    // Clicca icona chiusura
    await user.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(mockOnCancel).toHaveBeenCalledTimes(2);
  });

  it("calls onConfirm when pressing the confirm button", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Titolo Test"
        message="Messaggio di test del dialogo"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    await user.click(screen.getByRole("button", { name: "Conferma" }));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows loading state and disables buttons when isPending is true", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Titolo Test"
        message="Messaggio di test del dialogo"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isPending={true}
      />
    );
    
    const confirmBtn = screen.getByRole("button", { name: "Eliminazione..." });
    const cancelBtn = screen.getByRole("button", { name: "Annulla" });
    
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    // Prova a cliccare
    await user.click(confirmBtn);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
