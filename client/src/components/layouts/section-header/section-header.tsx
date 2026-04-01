import clsx from "clsx";
import { createContext, ReactNode, useContext } from "react";
import s from "./section-header.module.scss";

const InsideRootContext = createContext(false);
const useInsideRoot = (componentName: string) => {
  const insideRoot = useContext(InsideRootContext);

  if (!insideRoot) {
    throw new Error(`${componentName} должен быть использован внутри SectionHeader`);
  }
};

const Side = ({ children }: { children: ReactNode }) => {
  useInsideRoot("SectionHeader.Side");
  return <div className={s.side}>{children}</div>;
};

const Title = ({ children }: { children: ReactNode }) => {
  useInsideRoot("SectionHeader.Title");
  return <div className={s.title}>{children}</div>;
};

const Root = ({ children, bordered }: { children: ReactNode; bordered?: boolean }) => {
  return (
    <InsideRootContext.Provider value={true}>
      <div className={clsx(s.root, bordered && s.bordered)}>{children}</div>
    </InsideRootContext.Provider>
  );
};

export const SectionHeader = Object.assign(Root, { Title, Side });
