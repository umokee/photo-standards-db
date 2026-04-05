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

const Actions = ({ children }: { children: ReactNode }) => {
  useInsideTop("ContentHeader.Actions");
  return <div className={s.actions}>{children}</div>;
};

const Top = ({
  children,
  title,
  subtitles,
  meta,
}: {
  children: ReactNode;
  title: string;
  subtitles?: string[];
  meta?: string[];
}) => {
  useInsideRoot("ContentHeader.Top");
  return (
    <InsideTopContext.Provider value={true}>
      <div className={s.top}>
        <div>
          <div>{title}</div>
          {subtitles.map((st) => (
            <div className={s.sub}>{st}</div>
          ))}
        </div>
        {children}
      </div>
      <div className={s.meta}>
        {meta.map((m) => (
          <div className={s.stat}>{m}</div>
        ))}
      </div>
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
  Actions,
});
