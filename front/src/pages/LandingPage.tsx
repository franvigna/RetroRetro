import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="page page-narrow">
      <h1 className="brand-title pixel-text">RETRORETRO</h1>
      <p className="brand-tagline">Retrospectivas ágiles en modo arcade.</p>

      <div className="cabinet">
        <div className="cabinet-bezel" />
        <div className="landing-choices">
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate("/create")}>
            ▶ Crear sala
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => navigate("/join")}>
            ▶ Unirse a sala
          </button>
        </div>
      </div>
    </div>
  );
}
