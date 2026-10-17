import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Where the confirmation link in the email brings the person back to.
  // This address must be listed in Supabase → Authentication → URL Configuration → Redirect URLs.
  const emailRedirectTo = `${window.location.origin}/dashboard`;

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signUp: (email, password) =>
      supabase.auth.signUp({ email, password, options: { emailRedirectTo } }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    resendConfirmation: (email) =>
      supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } }),
    signInWithOAuth: (provider) =>
      supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      }),
    signOut: () => supabase.auth.signOut(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);