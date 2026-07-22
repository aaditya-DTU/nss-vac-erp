import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Password input with a show/hide toggle. Drop-in replacement for a plain
 * <input type="password" className="input" ... /> — accepts the same
 * value/onChange props, plus optional className overrides.
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  required = false,
  autoComplete = "current-password",
  className = "",
  ...rest
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        className={`input pr-10 ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70"
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}