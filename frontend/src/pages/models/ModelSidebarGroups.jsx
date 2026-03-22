import { useMemo, useState } from "react";
import Input from "../../components/Input";
import QueryState from "../../components/QueryState";

export default function ModelSidebarGroups({
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
      <div className="group-sidebar__header">
        <div className="group-sidebar__header-top">
          <span className="group-sidebar__header-name">Группы</span>
        </div>
        <Input placeholder={"Поиск..."} value={search} onChange={setSearch} />
      </div>
      <div className="group-sidebar__body">
        <QueryState
          isLoading={groupStatus.groups.isLoading}
          isError={groupStatus.groups.isError}
          isEmpty={!filtered.length}
          emptyText="Нет групп"
        >
          {filtered.map((group) => (
            <div
              key={group.id}
              className={`group-sidebar__body-item ${selectedGroupId === group.id ? "selected" : ""}`}
              onClick={() => onSelectGroup(group.id)}
            >
              <div className="group-sidebar__body-item-name">{group.name}</div>
              <div className="group-sidebar__body-item-info">
                <span>{group.standards_count} эталонов</span>
                <span>{group.images_count} фото</span>
              </div>
            </div>
          ))}
        </QueryState>
      </div>
    </>
  );
}
