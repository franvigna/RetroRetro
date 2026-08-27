// Controles de facilitación exclusivos del host. Ocultarlos para participantes
// es solo mejora de UX (front.md sección 4) — la seguridad real está en el
// backend, que valida socket.id contra hostId en cada evento.
//
// showTimeControls=false oculta +5min/-5min: durante expression_round no hay
// timer de fase que extender/acortar (esa fase usa speakerTimer en su lugar,
// ver back.md HU-B07) — Pausar/Reanudar siguen visibles porque ahí pausan el
// mini-timer de rotación en vez del timer de fase (decisión del backend, sin
// cambios en este componente).
export function HostControls({
  role,
  timerStatus,
  onAdvance,
  onGoBack,
  onPause,
  onResume,
  onAddTime,
  canGoBack,
  showTimeControls = true,
}) {
  if (role !== "host") return null;

  return (
    <div className="host-controls">
      <p className="host-controls-title">CONTROLES DE ANFITRIÓN</p>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onGoBack} disabled={!canGoBack}>
          ◀ Nivel anterior
        </button>
        <button type="button" className="btn btn-host" onClick={onAdvance}>
          Siguiente nivel ▶
        </button>
        {timerStatus === "paused" ? (
          <button type="button" className="btn btn-secondary" onClick={onResume}>
            Reanudar
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={onPause}>
            Pausar
          </button>
        )}
        {showTimeControls && (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => onAddTime(300)}>
              +5 min
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => onAddTime(-300)}>
              -5 min
            </button>
          </>
        )}
      </div>
    </div>
  );
}
