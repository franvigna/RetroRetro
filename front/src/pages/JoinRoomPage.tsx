import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext.tsx";
import { AvatarPicker } from "../components/AvatarPicker.tsx";

const STEP_CODE = 0;
const STEP_NAME = 1;

export function JoinRoomPage() {
  const navigate = useNavigate();
  const { code: codeFromUrl } = useParams<{ code?: string }>();
  const { joinRoom, room, roomNotFoundCode, clearRoomNotFound, roomLockedCode, clearRoomLocked } = useRoom();

  const [step, setStep] = useState(codeFromUrl ? STEP_NAME : STEP_CODE);
  const [code, setCode] = useState(codeFromUrl || "");
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (room?.code) {
      navigate(`/room/${room.code}`);
    }
  }, [room, navigate]);

  // Si el código dejó de existir mientras estábamos en el paso 2, volvemos al
  // paso 1 para que la persona pueda corregirlo en vez de quedar varada.
  useEffect(() => {
    if (roomNotFoundCode) {
      setStep(STEP_CODE);
    }
  }, [roomNotFoundCode]);

  const codeError = touched && !code.trim();
  const nameError = touched && !name.trim();

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!code.trim()) return;
    clearRoomNotFound();
    setTouched(false);
    setStep(STEP_NAME);
  }

  function handleBack() {
    setTouched(false);
    setStep(STEP_CODE);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !avatarId) return;
    clearRoomLocked();
    joinRoom(code.trim().toUpperCase(), name.trim(), avatarId);
  }

  return (
    <div className="page page-narrow">
      <h1 className="brand-title pixel-text">UNIRSE A SALA</h1>

      <div className="cabinet">
        <div className="cabinet-bezel" />
        <div className="step-indicator">
          {[STEP_CODE, STEP_NAME].map((i) => (
            <span key={i} className="step-dot" data-active={String(i === step)} />
          ))}
        </div>

        {step === STEP_CODE && (
          <form onSubmit={handleNext}>
            <h2 className="cabinet-title">PASO 1</h2>
            <p className="cabinet-subtitle">Código de sala</p>
            <div className="field">
              <label htmlFor="joinCode">Código de sala</label>
              <input
                id="joinCode"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="RETRO-XXXX"
              />
              {codeError && <span className="field-error">Ingresá el código de la sala.</span>}
            </div>

            {roomNotFoundCode && (
              <p className="error-banner">
                No encontramos ninguna sala con el código {roomNotFoundCode}. Revisá que esté bien escrito.
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block">
              Siguiente ▶
            </button>
          </form>
        )}

        {step === STEP_NAME && (
          <form onSubmit={handleSubmit}>
            <h2 className="cabinet-title">PASO 2</h2>
            <p className="cabinet-subtitle">Tu nombre</p>
            <div className="field">
              <label htmlFor="joinName">Tu nombre</label>
              <input
                id="joinName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Ana"
              />
              {nameError && <span className="field-error">Ingresá tu nombre.</span>}
            </div>
            <AvatarPicker value={avatarId} onChange={setAvatarId} required showError={touched} />

            {roomLockedCode === code.trim().toUpperCase() && (
              <p className="error-banner">
                Esta partida ya empezó — no se puede sumar gente nueva, solo reconectarse quien ya
                estaba adentro.
              </p>
            )}

            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={handleBack}>
                ◀ Atrás
              </button>
              <button type="submit" className="btn btn-primary">
                ▶ Entrar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
