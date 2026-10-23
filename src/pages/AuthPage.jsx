import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import OAuthButtons from "../components/OAuthButtons.jsx";
import Brand from "../components/Brand.jsx";

// Sign in and sign up are the same thing now: the account buttons below create the account the first time.
export default function AuthPage({ mode }) {
  const isSignup = mode === "signup";
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-wrap">
        <div className="auth-card" style={{ textAlign: "center", padding: "40px" }}>
          <p>Chargement de la session...</p>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-wrap auth-oauth-only">
      {/* The "or use your email" line inside OAuthButtons has nothing below it now, so it is hidden here. */}
      <style>{`.auth-oauth-only .or { display: none; }`}</style>
      <div className="auth-card">
        <Brand />
        <h1>{isSignup ? "Ouvrez votre boutique" : "Bon retour"}</h1>
        <p className="muted">
          {isSignup ? "Choisissez un compte ci-dessous pour créer votre boutique." : "Choisissez votre compte ci-dessous pour vous connecter."}
        </p>

        <OAuthButtons />

        <p className="auth-switch">
          {isSignup ? <>Vous avez déjà une boutique ? <Link to="/login">Se connecter</Link></>
                    : <>Nouveau ici ? <Link to="/signup">Ouvrir ma boutique</Link></>}
        </p>
      </div>
    </div>
  );
}