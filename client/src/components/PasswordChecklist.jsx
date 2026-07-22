import React from "react";
import { Check, X } from "lucide-react";
import { getPasswordChecks } from "../utils/passwordValidation";

/**
 * Live checklist shown under a password field while the user types.
 * Renders nothing until the user has typed something, so an empty field
 * doesn't greet them with a wall of red X's.
 */
export default function PasswordChecklist({ password }) {
  if (!password) return null;

  const checks = getPasswordChecks(password);

  return (
    <ul className="mt-2 space-y-1">
      {checks.map((c) => (
        <li
          key={c.key}
          className={`text-xs flex items-center gap-1.5 ${c.passed ? "text-green-600" : "text-ink/40"}`}
        >
          {c.passed ? <Check size={12} /> : <X size={12} />}
          {c.label}
        </li>
      ))}
    </ul>
  );
}