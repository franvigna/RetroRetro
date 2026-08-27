import carpeta from "../assets/sprites/avatar-carpeta.svg";
import ventana from "../assets/sprites/avatar-ventana.svg";
import disco from "../assets/sprites/avatar-disco.svg";
import terminal from "../assets/sprites/avatar-terminal.svg";
import cd from "../assets/sprites/avatar-cd.svg";
import documento from "../assets/sprites/avatar-documento.svg";
import relojCarga from "../assets/sprites/avatar-reloj-carga.svg";
import bombilla from "../assets/sprites/avatar-bombilla.svg";
import engranaje from "../assets/sprites/avatar-engranaje.svg";
import candado from "../assets/sprites/avatar-candado.svg";
import papelera from "../assets/sprites/avatar-papelera.svg";
import tarjetaPerforada from "../assets/sprites/avatar-tarjeta-perforada.svg";

// Set fijo y cerrado de personajes pixel-art 100% originales, inspirados en
// íconos clásicos de sistemas operativos y computación (carpeta, ventana,
// disco, terminal, etc.) — nunca mascotas/logos reales de un sistema
// operativo, lenguaje o consola concreta (ver CLAUDE.md). Formas grandes y
// alto contraste a propósito: a 16x16 el detalle fino se vuelve ilegible.
// Espejo de AVATAR_IDS en back/src/domain/room.js y shared-contract.md
// sección 1.
export const AVATARS = [
  { id: "carpeta", label: "Carpeta", src: carpeta },
  { id: "ventana", label: "Ventana", src: ventana },
  { id: "disco", label: "Disco", src: disco },
  { id: "terminal", label: "Terminal", src: terminal },
  { id: "cd", label: "CD", src: cd },
  { id: "documento", label: "Documento", src: documento },
  { id: "reloj-carga", label: "Reloj de carga", src: relojCarga },
  { id: "bombilla", label: "Bombilla", src: bombilla },
  { id: "engranaje", label: "Engranaje", src: engranaje },
  { id: "candado", label: "Candado", src: candado },
  { id: "papelera", label: "Papelera", src: papelera },
  { id: "tarjeta-perforada", label: "Tarjeta perforada", src: tarjetaPerforada },
];

export function getAvatarById(avatarId) {
  return AVATARS.find((a) => a.id === avatarId) ?? null;
}
