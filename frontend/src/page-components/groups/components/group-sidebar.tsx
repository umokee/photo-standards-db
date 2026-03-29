import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import useSidebar from "@/hooks/use-sidebar";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetGroups } from "../api/get-groups";
import { CreateGroup } from "./create-group";

export const GroupSidebar = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { close: closeSidebar } = useSidebar();
  const [search, setSearch] = useState("");

  const { data: groups = [], isLoading, isError } = useGetGroups();

  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  return (
    <>
      <div className="sidebar__header">
        <div className="sidebar__header-top">
          <span className="sidebar__title">Группы</span>
        </div>
        <Input placeholder={"Поиск..."} value={search} onChange={setSearch} />
      </div>

      <div className="sidebar__list">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          isEmpty={!filtered.length}
          emptyText="Нет групп"
          loader="skeleton"
        >
          {filtered.map((group) => (
            <div
              key={group.id}
              className={clsx("sidebar__item", groupId === group.id && "sidebar__item--active")}
              onClick={() => {
                navigate(`/groups/${group.id}`);
                closeSidebar();
              }}
            >
              <span className="sidebar__item-dot" />
              <div className="sidebar__item-body">
                <span className="sidebar__item-name">{group.name}</span>
              </div>
              <span className="sidebar__item-count">{group.standards_count ?? 0}</span>
            </div>
          ))}
        </QueryState>
      </div>

      <div className="sidebar__footer">
        <CreateGroup />
      </div>
    </>
  );
};
