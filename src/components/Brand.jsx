import { Link } from "react-router-dom";
import logo from "../logo/logo.png";
import { SHOW_BRAND_TEXT } from "../lib/config.js";

export default function Brand({ to = "/" }) {
  return (
    <Link to={to} className="brand" aria-label="VintrexShop home">
      <img src={logo} alt="" />
      {SHOW_BRAND_TEXT && <span>Vintrex<b>Shop</b></span>}
    </Link>
  );
}
