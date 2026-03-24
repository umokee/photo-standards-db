import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Input from "../../components/Input";
import QueryState from "../../components/QueryState";
import useSidebar from "../../hooks/useSidebar";

export default function GroupSidebar({ groups, selectedId, status, onAdd }) {
  const navigate = useNavigate();
  const { close: closeSidebar } = useSidebar();
  const [search, setSearch] = useState("");
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
          isLoading={status.groups.isLoading}
          isError={status.groups.isError}
          isEmpty={!filtered.length}
          emptyText="Нет групп"
        >
          {filtered.map((group) => (
            <div
              key={group.id}
              className={`sidebar__item${selectedId === group.id ? " sidebar__item--active" : ""}`}
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
        <Button
          variant="ghost"
          full
          size="sm"
          icon={Plus}
          disabled={status.groups.isLoading || status.groups.isError}
          onClick={onAdd}
        >
          Новая группа
        </Button>
      </div>
    </>
  );
}
