import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { configured } from "./lib/supabase";
import Landing from "./pages/Landing.jsx";

// Every page except the landing page is loaded only when someone opens it,
// so the first visit downloads far less JavaScript.
const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const Privacy = lazy(() => import("./pages/Legal.jsx").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Legal.jsx").then((m) => ({ default: m.Terms })));
const Contact = lazy(() => import("./pages/Legal.jsx").then((m) => ({ default: m.Contact })));
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout.jsx"));
const Products = lazy(() => import("./pages/dashboard/Products.jsx"));
const Orders = lazy(() => import("./pages/dashboard/Orders.jsx"));
const Delivery = lazy(() => import("./pages/dashboard/Delivery.jsx"));
const Stats = lazy(() => import("./pages/dashboard/Stats.jsx"));
const Customize = lazy(() => import("./pages/dashboard/Customize.jsx"));
const Settings = lazy(() => import("./pages/dashboard/Settings.jsx"));
const StoreLayout = lazy(() => import("./pages/store/StoreLayout.jsx"));
const StoreHome = lazy(() => import("./pages/store/StoreHome.jsx"));
const ProductPage = lazy(() => import("./pages/store/ProductPage.jsx"));
const CartPage = lazy(() => import("./pages/store/CartPage.jsx"));
const OrderDone = lazy(() => import("./pages/store/OrderDone.jsx"));

function SetupNotice() {
  return (
    <div className="setup-notice">
      <h1>Connect Supabase to continue</h1>
      <p>Copy <code>.env.example</code> to <code>.env</code>, fill in your project URL and publishable key, then restart <code>npm run dev</code>.</p>
    </div>
  );
}

function PageLoading() {
  return <div className="center-note">Loading...</div>;
}

export default function App() {
  if (!configured) return <SetupNotice />;
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />

        {/* Public pages (needed for AdSense) */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="stats" replace />} />
          <Route path="stats" element={<Stats />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="customize" element={<Customize />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/store/:slug" element={<StoreLayout />}>
          <Route index element={<StoreHome />} />
          <Route path="product/:productId" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="thanks" element={<OrderDone />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}