import useSidebar from "@/hooks/use-sidebar";
import clsx from "clsx";
import React from "react";
import s from "./split-layout.module.scss";

const Root = ({ children }: { children: React.ReactNode }) => {
  return <div className={s.root}>{children}</div>;
};

const Content = ({ children }: { children: React.ReactNode }) => {
  return <div className={s.content}>{children}</div>;
};

const Topbar = ({ children }: { children: React.ReactNode }) => {
  return <div className={s.topbar}>{children}</div>;
};

const Body = ({ children, bare }: { children: React.ReactNode; bare?: boolean }) => {
  return <div className={clsx(s.body, bare && s.bare)}>{children}</div>;
};

const Bottombar = ({ children }: { children: React.ReactNode }) => {
  return <div className={s.bottombar}>{children}</div>;
};

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const { open } = useSidebar();
  return <div className={clsx(s.sidebar, open && s.open)}>{children}</div>;
};

const Panel = ({ children }: { children: React.ReactNode }) => {
  return <div className={s.panel}>{children}</div>;
};

export const SplitLayout = Object.assign(Root, {
  Content,
  Body,
  Topbar,
  Bottombar,
  Sidebar,
  Panel,
});
