import { useEffect } from "react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import "../landing.css";

// CHANGE THIS to an inbox you really read. AdSense and visitors expect it to work.
const CONTACT_EMAIL = "vintrex.contact@gmail.com";
const UPDATED = "16 octobre 2026";

function Page({ title, children }) {
  useEffect(() => { document.title = `${title} - VintrexShop`; }, [title]);
  return (
    <div className="landing">
      <header className="landing-nav"><Brand /><nav><Link className="btn btn-ghost" to="/">Accueil</Link></nav></header>
      <main className="lp-doc">
        <h1>{title}</h1>
        {children}
      </main>
      <footer className="landing-foot">
        <div className="lp-wrap lp-foot">
          <span>&copy; {new Date().getFullYear()} VintrexShop</span>
          <nav aria-label="Mentions légales">
            <Link to="/privacy">Politique de confidentialité</Link>
            <Link to="/terms">Conditions d'utilisation</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function Privacy() {
  return (
    <Page title="Politique de confidentialité">
      <p className="muted">Dernière mise à jour : {UPDATED}</p>
      <p>VintrexShop permet à chacun d'ouvrir une boutique en ligne et de vendre des produits avec paiement à la livraison. Cette page explique quelles informations nous et les boutiques de notre plateforme collectons, et ce que nous en faisons.</p>

      <h2>Informations que nous collectons</h2>
      <h3>Vendeurs</h3>
      <p>Lorsque vous créez un compte, nous conservons votre adresse e-mail et les informations de boutique que vous saisissez : nom de la boutique, adresse de votre page boutique, logo, bannière, couleurs, numéro de téléphone, produits, prix et stock.</p>
      <h3>Clients qui passent commande</h3>
      <p>Lorsque vous commandez dans une boutique, vous saisissez votre nom, votre numéro de téléphone, votre ville, votre adresse et une note facultative. Ces informations sont enregistrées afin que le propriétaire de la boutique puisse vous contacter et vous livrer. Elles ne sont visibles que par le propriétaire de cette boutique et par personne d'autre sur la plateforme.</p>
      <h3>Visites</h3>
      <p>Nous comptons les visites de chaque page boutique, à raison d'un comptage par session de navigation. Le compteur est affiché sous forme de total et n'est pas lié à votre identité.</p>

      <h2>Cookies et stockage local</h2>
      <p>Nous enregistrons votre panier dans le stockage local de votre navigateur afin qu'il soit toujours là à votre retour. Nous utilisons le stockage de session pour ne pas compter deux fois la même visite. Les vendeurs restent connectés grâce à un jeton de session conservé dans le navigateur. Vous pouvez effacer ces données à tout moment dans les paramètres de votre navigateur.</p>

      <h2>Publicité et services tiers</h2>
      <p>Nous pouvons afficher des publicités diffusées par Google AdSense sur certaines parties de VintrexShop. Google et ses partenaires utilisent des cookies pour diffuser des publicités en fonction de vos visites sur ce site et sur d'autres sites. Vous pouvez refuser la publicité personnalisée dans les <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">paramètres des annonces Google</a>, et en savoir plus sur <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">la façon dont Google utilise les données des sites qui utilisent ses services</a>.</p>
      <p>Nous nous appuyons aussi sur ces services pour faire fonctionner le site : Supabase (base de données, connexion et stockage de fichiers), Vercel (hébergement) et Google Fonts (polices affichées sur les pages boutique). Ils reçoivent des données techniques, comme votre adresse IP, lorsque votre navigateur se connecte à eux.</p>

      <h2>Comment nous utilisons ces informations</h2>
      <p>Nous les utilisons pour faire fonctionner les boutiques et les commandes, envoyer des alertes de nouvelle commande aux vendeurs, assurer la sécurité du service et l'améliorer. Nous ne vendons pas les informations personnelles.</p>

      <h2>Partage</h2>
      <p>Nous ne partageons les informations qu'avec les prestataires de services listés ci-dessus, avec le propriétaire de la boutique chez qui vous avez commandé, ou lorsque la loi l'exige.</p>

      <h2>Conservation et vos droits</h2>
      <p>Nous conservons les données de compte et de commande tant que le compte est actif. Pour consulter, corriger ou supprimer vos informations, écrivez-nous à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Si vous avez commandé dans une boutique, le propriétaire de celle-ci détient aussi les détails de votre commande et peut les supprimer.</p>

      <h2>Enfants</h2>
      <p>VintrexShop ne s'adresse pas aux enfants de moins de 13 ans et nous ne collectons pas sciemment leurs informations.</p>

      <h2>Modifications</h2>
      <p>Si nous modifions cette politique, nous mettrons à jour la date en haut de cette page.</p>
      <p>Des questions ? <Link to="/contact">Contactez-nous</Link>.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Conditions d'utilisation">
      <p className="muted">Dernière mise à jour : {UPDATED}</p>
      <p>En utilisant VintrexShop, vous acceptez ces conditions.</p>

      <h2>Ce qu'est VintrexShop</h2>
      <p>VintrexShop fournit des outils permettant aux vendeurs de publier une boutique en ligne et de recevoir des commandes. La vente elle-même a lieu entre le propriétaire de la boutique et le client. VintrexShop ne traite pas les paiements, ne livre pas les marchandises et ne garantit aucune vente.</p>

      <h2>Responsabilités du vendeur</h2>
      <p>Vous êtes responsable de vos produits, de vos prix, de vos descriptions, de vos photos, de vos livraisons et de votre service client. Vous devez avoir le droit de vendre ce que vous proposez et d'utiliser les images que vous importez. Vous devez respecter la loi applicable à votre activité.</p>

      <h2>Ce qui est interdit</h2>
      <p>Vous ne pouvez pas vendre de produits illégaux, contrefaits, volés, dangereux ou réservés aux adultes, publier des contenus trompeurs ou haineux, collecter des données clients à d'autres fins que l'exécution des commandes, ni tenter de perturber le service ou d'y accéder frauduleusement. Nous pouvons dépublier les boutiques ou fermer les comptes qui enfreignent ces règles.</p>

      <h2>Clients</h2>
      <p>Lorsque vous commandez, vous vous engagez à fournir des coordonnées exactes et à payer la boutique en espèces à la livraison. Les questions sur une commande, les retours ou les remboursements s'adressent au propriétaire de la boutique.</p>

      <h2>Disponibilité et responsabilité</h2>
      <p>Nous nous efforçons de maintenir le service en marche, mais nous ne pouvons pas promettre qu'il sera toujours disponible ou exempt d'erreurs. Dans la mesure permise par la loi, VintrexShop n'est pas responsable des pertes liées aux ventes, aux livraisons ou aux litiges entre vendeurs et clients.</p>

      <h2>Modifications</h2>
      <p>Nous pouvons mettre à jour ces conditions. Continuer à utiliser VintrexShop après une modification vaut acceptation.</p>
      <p>Des questions ? <Link to="/contact">Contactez-nous</Link>. Consultez aussi notre <Link to="/privacy">politique de confidentialité</Link>.</p>
    </Page>
  );
}

export function Contact() {
  return (
    <Page title="Contact">
      <p>Des questions sur votre boutique, une commande ou vos données ? Écrivez-nous et nous vous répondrons dès que possible.</p>
      <p><a className="btn btn-primary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      <p className="muted">Si vous avez commandé dans une boutique et avez besoin d'aide pour la livraison, contactez directement cette boutique au numéro de téléphone indiqué sur sa page.</p>
    </Page>
  );
}