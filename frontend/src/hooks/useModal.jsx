import { useState } from "react";

export default function useModal() {
  const [modal, setModal] = useState(null);

  const open = (type, data = {}) => setModal({ type, data });
  const close = () => setModal(null);

  return { modal, open, close };
}
