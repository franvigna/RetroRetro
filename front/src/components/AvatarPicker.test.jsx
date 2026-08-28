import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AvatarPicker } from "./AvatarPicker.jsx";
import { AVATARS } from "../domain/avatars.js";

describe("AvatarPicker", () => {
  it("renderiza todas las opciones del set fijo", () => {
    render(<AvatarPicker value={null} onChange={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(AVATARS.length);
  });

  it("selecciona un personaje al tocarlo", () => {
    const onChange = vi.fn();
    render(<AvatarPicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(AVATARS[0].label));
    expect(onChange).toHaveBeenCalledWith(AVATARS[0].id);
  });

  it("deselecciona el personaje si se toca de nuevo el ya elegido", () => {
    const onChange = vi.fn();
    render(<AvatarPicker value={AVATARS[0].id} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(AVATARS[0].label));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("marca aria-pressed solo en el personaje seleccionado", () => {
    render(<AvatarPicker value={AVATARS[2].id} onChange={() => {}} />);
    expect(screen.getByLabelText(AVATARS[2].label)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(AVATARS[0].label)).toHaveAttribute("aria-pressed", "false");
  });
});

describe("AvatarPicker — sin avatares cargados", () => {
  it("no renderiza nada si AVATARS está vacío", async () => {
    vi.resetModules();
    vi.doMock("../domain/avatars.js", () => ({ AVATARS: [] }));
    const { AvatarPicker: AvatarPickerEmpty } = await import("./AvatarPicker.jsx");
    const { container } = render(<AvatarPickerEmpty value={null} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    vi.doUnmock("../domain/avatars.js");
  });
});
