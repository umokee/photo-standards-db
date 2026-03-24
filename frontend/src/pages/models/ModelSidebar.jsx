import { useMemo, useState } from "react";
import Input from "../../components/Input";
import QueryState from "../../components/QueryState";

export default function ModelSidebar({
  groups,
  groupStatus,
  selectedGroupId,
  onSelectGroup,
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  return (
    <>
      <div className="sidebar__header">
        <div className="sidebar__header-top">
          <span className="sidebar__header-name">Группы</span>
        </div>
        <Input placeholder={"Поиск..."} value={search} onChange={setSearch} />
      </div>
      <div className="sidebar__body">
        <QueryState
          isLoading={groupStatus.groups.isLoading}
          isError={groupStatus.groups.isError}
          isEmpty={!filtered.length}
          emptyText="Нет групп"
        >
          {filtered.map((group) => (
            <div
              key={group.id}
              className={`sidebar__item${selectedGroupId === group.id ? " sidebar__item--active" : ""}`}
              onClick={() => onSelectGroup(group.id)}
            >
              <span>{group.name}</span>
              <span>{group.standards_count}</span>
            </div>
          ))}
        </QueryState>
      </div>
    </>
  );
}
