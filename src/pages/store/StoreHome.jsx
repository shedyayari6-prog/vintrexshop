import { useOutletContext } from "react-router-dom";
import StoreView from "../../components/StoreView.jsx";

export default function StoreHome() {
  const { store, products, base, cart } = useOutletContext();
  return <StoreView store={store} products={products} base={base} cart={cart} />;
}