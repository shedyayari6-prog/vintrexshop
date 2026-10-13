import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import Brand from "../components/Brand.jsx";

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav>
          {user ? (
            <Link className="btn btn-primary" to="/dashboard">Open dashboard</Link>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">Log in</Link>
              <Link className="btn btn-primary" to="/signup">Open your store</Link>
            </>
          )}
        </nav>
      </header>

      <main className="landing-hero">
        <h1>Your shop gets its own address.</h1>
        <p className="lead">
          Add your products, pick your colors, share one link. Customers order and pay
          when the package arrives.
        </p>
        <div className="url-pill" aria-label="Example store address">
          <span>vintrexshop.com/store/</span><strong>urban-wear</strong>
        </div>
        <div className="hero-actions">
          <Link className="btn btn-primary btn-lg" to="/signup">Open your store</Link>
        </div>
      </main>

      <section className="landing-grid">
        <article>
          <h3>Looks like your brand</h3>
          <p>Upload a logo and banner, choose your colors and font, and see changes live before you publish.</p>
        </article>
        <article>
          <h3>Orders in one place</h3>
          <p>Every order lands in your dashboard with the customer's phone and address, ready to confirm and ship.</p>
        </article>
        <article>
          <h3>Cash on delivery</h3>
          <p>No card needed from your customers. Stock updates itself every time an order comes in.</p>
        </article>
      </section>

      <footer className="landing-foot">VintrexShop</footer>
    </div>
  );
}