import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Input from "../../components/Input";
import QueryState from "../../components/QueryState";

export default function GroupSidebar({ groups, selectedId, status, onAdd }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  return (
    <>
      <div className="group-sidebar__header">
        <div className="group-sidebar__header-top">
          <span className="group-sidebar__header-name">Группы</span>
          <Button
            disabled={status.groups.isLoading || status.groups.isError}
            icon={Plus}
            variant={"secondary"}
            onClick={onAdd}
          />
        </div>
        <Input placeholder={"Поиск..."} value={search} onChange={setSearch} />
      </div>
      <div className="group-sidebar__body">
        <QueryState
          isLoading={status.groups.isLoading}
          isError={status.groups.isError}
          isEmpty={!filtered.length}
          emptyText="Нет групп"
        >
          {filtered.map((group) => (
            <div
              key={group.id}
              className={`group-sidebar__body-item ${selectedId === group.id ? "selected" : ""}`}
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <div className="group-sidebar__body-item-name">{group.name}</div>
              <div className="group-sidebar__body-item-description">{group.description}</div>
            </div>
          ))}
        </QueryState>
      </div>
    </>
  );
}
