import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as authApi from "../api/authApi";

const TOKEN_KEY = "despensa_token";
const USER_KEY = "despensa_user";

function decodeTokenPayload(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const decoded = decodeTokenPayload(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

function loadToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
  return token;
}

function loadUser() {
  const token = loadToken();
  if (!token) return null;
  const saved = localStorage.getItem(USER_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch { return null; }
  }
  return null;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t && isTokenExpired(t)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
    return t;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    setToken(data.token);
    setUser({
      id: data.id,
      username: data.username,
      nombre: data.nombre,
      rol: data.rol,
    });
    return data;
  }, []);

  const register = useCallback(async (username, password, nombre, idRol) => {
    const data = await authApi.register(username, password, nombre, idRol);
    setToken(data.token);
    setUser({
      id: data.id,
      username: data.username,
      nombre: data.nombre,
      rol: data.rol,
    });
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const value = {
    user,
    token,
    login,
    logout,
    register,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.rol === "ADMIN",
    isCajero: user?.rol === "CAJERO",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
