"use client";

// Campo de senha com olhinho (mostrar/ocultar). Reutilizado no login e no reset.
import { useState } from "react";

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <span className="pass-row">
      <input {...props} type={show ? "text" : "password"} />
      <button
        type="button"
        className={`pass-eye${show ? " showing" : ""}`}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setShow((s) => !s)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </span>
  );
}
