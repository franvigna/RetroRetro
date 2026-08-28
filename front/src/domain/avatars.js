import cisco from "../assets/sprites/avatar-cisco.png";
import licha from "../assets/sprites/avatar-licha.png";
import juampy from "../assets/sprites/avatar-juampy.png";
import mili from "../assets/sprites/avatar-mili.png";
import agus from "../assets/sprites/avatar-agus.png";
import sergio from "../assets/sprites/avatar-sergio.png";

// Set de personajes pixel-art seleccionables al crear/unirse a una sala.
// Generados con la herramienta interna Avatar Lab
// (front/src/pages/AvatarLabPage.jsx, ruta /dev/avatar-lab) a partir de
// fotos reales del equipo Jaliscom. Para sumar uno nuevo, usar esa
// herramienta y pegar el snippet que genera.
// Espejo de AVATAR_IDS en back/src/domain/room.js y shared-contract.md
// seccion 1 — si se agrega un id acá, hay que agregarlo ahí también.
export const AVATARS = [
  { id: "cisco", label: "Cisco", src: cisco },
  { id: "licha", label: "Licha", src: licha },
  { id: "juampy", label: "Juampy", src: juampy },
  { id: "mili", label: "Mili", src: mili },
  { id: "agus", label: "Agus", src: agus },
  { id: "sergio", label: "Sergio", src: sergio },
];

export function getAvatarById(avatarId) {
  return AVATARS.find((a) => a.id === avatarId) ?? null;
}
