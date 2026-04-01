import { createContext, ReactNode, useContext } from "react";
import s from "./content-header.module.scss";

const InsideRootContext = createContext(false);
const useInsideRoot = (componentName: string) => {
  const insideRoot = useContext(InsideRootContext);

  if (!insideRoot) {
    throw new Error(`${componentName} должен быть использован внутри ContentHeader`);
  }
};

const InsideTopContext = createContext(false);
const useInsideTop = (componentName: string) => {
  const insideTop = useContext(InsideTopContext);

  if (!insideTop) {
    throw new Error(`${componentName} должен быть использован внутри ContentHeader.Top`);
  }
};

const InsideMetaContext = createContext(false);
const useInsideMeta = (componentName: string) => {
  const insideMeta = useContext(InsideMetaContext);

  if (!insideMeta) {
    throw new Error(`${componentName} должен быть использован внутри ContentHeader.Meta`);
  }
};

const Stat = ({ children }: { children: ReactNode }) => {
  useInsideMeta("ContentHeader.Stat");
  return <div className={s.stat}>{children}</div>;
};

const Title = ({ children }: { children: ReactNode }) => {
  useInsideTop("ContentHeader.Title");
  return <div className={s.title}>{children}</div>;
};

const Subtitle = ({ children }: { children: ReactNode }) => {
  useInsideTop("ContentHeader.Subtitle");
  return <div className={s.sub}>{children}</div>;
};

const Actions = ({ children }: { children: ReactNode }) => {
  useInsideTop("ContentHeader.Actions");
  return <div className={s.actions}>{children}</div>;
};

const Meta = ({ children }: { children: ReactNode }) => {
  useInsideRoot("ContentHeader.Meta");
  return (
    <InsideMetaContext.Provider value={true}>
      <div className={s.meta}>{children}</div>
    </InsideMetaContext.Provider>
  );
};

const Top = ({ children }: { children: ReactNode }) => {
  useInsideRoot("ContentHeader.Top");
  return (
    <InsideTopContext.Provider value={true}>
      <div className={s.top}>{children}</div>
    </InsideTopContext.Provider>
  );
};

const Root = ({ children }: { children: ReactNode }) => {
  return (
    <InsideRootContext.Provider value={true}>
      <div className={s.root}>{children}</div>
    </InsideRootContext.Provider>
  );
};

export const ContentHeader = Object.assign(Root, {
  Top,
  Title,
  Subtitle,
  Actions,
  Meta,
  Stat,
});
