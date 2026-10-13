import { Routes, Route, Navigate } from "react-router-dom";
import { configured } from "./lib/supabase";
import Landing from "./pages/Landing.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardLayout from "./pages/dashboard/DashboardLayout.jsx";
import Products from "./pages/dashboard/Products.jsx";
import Orders from "./pages/dashboard/Orders.jsx";
import Stats from "./pages/dashboard/Stats.jsx";
import Customize from "./pages/dashboard/Customize.jsx";
import Settings from "./pages/dashboard/Settings.jsx";
import StoreLayout from "./pages/store/StoreLayout.jsx";
import StoreHome from "./pages/store/StoreHome.jsx";
import ProductPage from "./pages/store/ProductPage.jsx";
import CartPage from "./pages/store/CartPage.jsx";
import OrderDone from "./pages/store/OrderDone.jsx";

function SetupNotice() {
  return (
    <div className="setup-notice">
      <h1>Connect Supabase to continue</h1>
      <p>Copy <code>.env.example</code> to <code>.env</code>, fill in your project URL and publishable key, then restart <code>npm run dev</code>.</p>
    </div>
  );
}

export default function App() {
  if (!configured) return <SetupNotice />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="stats" replace />} />
        <Route path="stats" element={<Stats />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
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
  );
}