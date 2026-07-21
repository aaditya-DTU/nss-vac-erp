import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem("nss_user");
    if (!cached || cached === "undefined") return null;
    try {
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem("nss_user");
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const PUBLIC_ONLY_PATHS = ["/login", "/register", "/forgot-password", "/about", "/verify"];
    const isPublicOnlyPath = PUBLIC_ONLY_PATHS.some(
      (p) =>
        window.location.pathname === p ||
        window.location.pathname.startsWith(`${p}/`),
    );
    const cachedRaw = localStorage.getItem("nss_user");
    const hasCachedUser = !!cachedRaw && cachedRaw !== "undefined";

    if (isPublicOnlyPath && !hasCachedUser) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("nss_user", JSON.stringify(data.user));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem("nss_user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("nss_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    return data;
  };

  const verifyOtp = async (email, otp) => {
    const { data } = await api.post("/auth/verify-otp", { email, otp });
    localStorage.setItem("nss_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const resendOtp = async (email) => {
    const { data } = await api.post("/auth/resend-otp", { email });
    return data;
  };

  const forgotPassword = async (email) => {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  };

  const resendResetOtp = async (email) => {
    const { data } = await api.post("/auth/resend-reset-otp", { email });
    return data;
  };

  const verifyResetOtp = async (email, otp) => {
    const { data } = await api.post("/auth/verify-reset-otp", { email, otp });
    return data; // { success, resetToken }
  };

  const resetPassword = async (resetToken, newPassword) => {
    const { data } = await api.post("/auth/reset-password", { resetToken, newPassword });
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("nss_user");
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    localStorage.setItem("nss_user", JSON.stringify(data.user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resendResetOtp,
        verifyResetOtp,
        resetPassword,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);