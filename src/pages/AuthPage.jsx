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
          <p>Loading session...</p>
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
        <h1>{isSignup ? "Open your store" : "Welcome back"}</h1>
        <p className="muted">
          {isSignup ? "Choose an account below to create your store." : "Choose your account below to log in."}
        </p>

        <OAuthButtons />

        <p className="auth-switch">
          {isSignup ? <>Already have a store? <Link to="/login">Log in</Link></>
                    : <>New here? <Link to="/signup">Open your store</Link></>}
        </p>
      </div>
    </div>
  );
}