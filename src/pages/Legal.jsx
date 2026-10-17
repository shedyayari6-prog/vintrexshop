import { useEffect } from "react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import "../landing.css";

// CHANGE THIS to an inbox you really read. AdSense and visitors expect it to work.
const CONTACT_EMAIL = "vintrex.contact@gmail.com";
const UPDATED = "October 16, 2026";

function Page({ title, children }) {
  useEffect(() => { document.title = `${title} - VintrexShop`; }, [title]);
  return (
    <div className="landing">
      <header className="landing-nav"><Brand /><nav><Link className="btn btn-ghost" to="/">Home</Link></nav></header>
      <main className="lp-doc">
        <h1>{title}</h1>
        {children}
      </main>
      <footer className="landing-foot">
        <div className="lp-wrap lp-foot">
          <span>&copy; {new Date().getFullYear()} VintrexShop</span>
          <nav aria-label="Legal">
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/terms">Terms of use</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy policy">
      <p className="muted">Last updated: {UPDATED}</p>
      <p>VintrexShop lets people open an online store and sell products with cash on delivery. This page explains what information we and the stores on our platform collect, and what we do with it.</p>

      <h2>Information we collect</h2>
      <h3>Sellers</h3>
      <p>When you create an account we store your email address and the store details you enter: store name, address of your store page, logo, banner, colors, phone number, products, prices and stock.</p>
      <h3>Customers who place an order</h3>
      <p>When you order from a store, you enter your name, phone number, city, address and an optional note. This information is saved so the store owner can contact you and deliver your order. It is shown to that store's owner and to nobody else on the platform.</p>
      <h3>Visits</h3>
      <p>We count visits to each store page, using one count per browser session. The count is shown as a total and is not linked to your identity.</p>

      <h2>Cookies and local storage</h2>
      <p>We store your shopping cart in your browser's local storage so it is still there if you come back. We use session storage to avoid counting the same visit twice. Sellers stay logged in through a session token kept in the browser. You can clear these at any time in your browser settings.</p>

      <h2>Advertising and third-party services</h2>
      <p>We may show ads served by Google AdSense on parts of VintrexShop. Google and its partners use cookies to serve ads based on your visits to this and other websites. You can opt out of personalized advertising in <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>, and learn more at <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">how Google uses data from sites that use its services</a>.</p>
      <p>We also rely on these services to run the site: Supabase (database, login and file storage), Vercel (hosting) and Google Fonts (fonts shown on store pages). They receive technical data such as your IP address when your browser connects to them.</p>

      <h2>How we use information</h2>
      <p>We use it to run stores and orders, send new-order alerts to sellers, keep the service secure, and improve it. We do not sell personal information.</p>

      <h2>Sharing</h2>
      <p>We share information only with the service providers listed above, with the store owner you ordered from, or when the law requires it.</p>

      <h2>Retention and your rights</h2>
      <p>We keep account and order data while the account is active. To see, correct or delete your information, email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If you ordered from a store, the store owner also holds your order details and can delete them.</p>

      <h2>Children</h2>
      <p>VintrexShop is not directed to children under 13 and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If we change this policy we will update the date at the top of this page.</p>
      <p>Questions? <Link to="/contact">Contact us</Link>.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of use">
      <p className="muted">Last updated: {UPDATED}</p>
      <p>By using VintrexShop you agree to these terms.</p>

      <h2>What VintrexShop is</h2>
      <p>VintrexShop provides tools for sellers to publish an online store and receive orders. The sale itself is between the store owner and the customer. VintrexShop does not process payments, deliver goods or guarantee any sale.</p>

      <h2>Seller responsibilities</h2>
      <p>You are responsible for your products, prices, descriptions, photos, delivery and customer service. You must have the right to sell what you list and to use the images you upload. You must follow the law that applies to your business.</p>

      <h2>Not allowed</h2>
      <p>You may not sell illegal, counterfeit, stolen, dangerous or adult goods, post misleading or hateful content, collect customer data for any purpose other than fulfilling orders, or try to disrupt or break into the service. We may unpublish stores or close accounts that break these rules.</p>

      <h2>Customers</h2>
      <p>When you order, you agree to provide correct contact details and to pay the store in cash on delivery. Questions about an order, returns or refunds go to the store owner.</p>

      <h2>Availability and liability</h2>
      <p>We work to keep the service running but cannot promise it will always be available or error-free. To the extent the law allows, VintrexShop is not liable for losses from sales, deliveries or disputes between sellers and customers.</p>

      <h2>Changes</h2>
      <p>We may update these terms. Continuing to use VintrexShop after a change means you accept it.</p>
      <p>Questions? <Link to="/contact">Contact us</Link>. See also our <Link to="/privacy">privacy policy</Link>.</p>
    </Page>
  );
}

export function Contact() {
  return (
    <Page title="Contact">
      <p>Questions about your store, an order, or your data? Write to us and we will reply as soon as we can.</p>
      <p><a className="btn btn-primary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      <p className="muted">If you ordered from a store and need help with delivery, contact that store directly using the phone number on its page.</p>
    </Page>
  );
}
