import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { StatusChip } from "../components/StatusChip.jsx";
import { Modal } from "../components/Modal.jsx";
import { ToastProvider, useToast } from "../context/ToastContext.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";

describe("Frontend Component Tests", () => {
  describe("StatusChip Component", () => {
    it("renders pending status chip with correct text and class", () => {
      const { container } = render(<StatusChip status="pending" />);
      expect(screen.getByText("pending")).toBeInTheDocument();
      expect(container.querySelector(".status-chip.pending")).toBeTruthy();
    });

    it("renders approved status chip", () => {
      const { container } = render(<StatusChip status="approved" />);
      expect(screen.getByText("approved")).toBeInTheDocument();
      expect(container.querySelector(".status-chip.approved")).toBeTruthy();
    });

    it("renders rejected status chip", () => {
      const { container } = render(<StatusChip status="rejected" />);
      expect(screen.getByText("rejected")).toBeInTheDocument();
      expect(container.querySelector(".status-chip.rejected")).toBeTruthy();
    });

    it("renders cancelled status chip", () => {
      const { container } = render(<StatusChip status="cancelled" />);
      expect(screen.getByText("cancelled")).toBeInTheDocument();
      expect(container.querySelector(".status-chip.cancelled")).toBeTruthy();
    });
  });

  describe("Modal Component", () => {
    it("renders nothing when isOpen is false", () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Modal Body</p>
        </Modal>
      );
      expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
    });

    it("renders title and content when isOpen is true", () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal Body Content</p>
        </Modal>
      );
      expect(screen.getByText("Test Modal")).toBeInTheDocument();
      expect(screen.getByText("Modal Body Content")).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Body</p>
        </Modal>
      );
      const closeBtn = screen.getByLabelText("Close modal");
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Toast Notifications", () => {
    const TestComponent = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => addToast("Operation successful!", "success")}>
          Trigger Toast
        </button>
      );
    };

    it("displays and dismisses toast message", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const triggerBtn = screen.getByText("Trigger Toast");
      fireEvent.click(triggerBtn);

      expect(screen.getByText("Operation successful!")).toBeInTheDocument();

      const dismissBtn = screen.getByLabelText("Close notification");
      fireEvent.click(dismissBtn);

      expect(screen.queryByText("Operation successful!")).not.toBeInTheDocument();
    });
  });

  describe("LoginPage", () => {
    it("renders login form and demo credentials", () => {
      render(
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <LoginPage />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      );

      expect(screen.getByText("Sign In to LeaveSync")).toBeInTheDocument();
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();

      // Demo login buttons
      expect(screen.getByText(/Alice \(Admin\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob \(Manager\)/i)).toBeInTheDocument();
      expect(screen.getByText(/David \(Employee\)/i)).toBeInTheDocument();
    });
  });
});
