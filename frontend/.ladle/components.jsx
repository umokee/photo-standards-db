import { MemoryRouter } from "react-router-dom";
import "../src/styles/main.scss";

export const Provider = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;
