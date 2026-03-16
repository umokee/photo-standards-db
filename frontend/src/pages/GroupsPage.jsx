import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import DeleteModal from "../components/modals/DeleteModal";
import Input from "../components/Input";
import QueryState from "../components/QueryState";
import useGroups from "../hooks/useGroups";
import useModal from "../hooks/useModal";
import useStandards from "../hooks/useStandards";
import { formatDate } from "../utils/format";
import GroupFormModal from "../components/modals/GroupFormModal";
import StandardCreateModal from "../components/modals/StandardCreateModal";
import StandardItem from "../components/items/StandardItem";
import StandardUpdateModal from "../components/modals/StandardUpdateModal";

export default function GroupsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const selectedId = id ?? null;
  const [search, setSearch] = useState("");
  const { modal, open, close } = useModal();
  const { groups, selected, status, create, update, remove } = useGroups(selectedId);
  const { create: createStandard, update: updateStandard, remove: removeStandard } = useStandards();
  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  return (
    <div className="page-split">
      <div className="page-split__sidebar">
        <div className="group-sidebar__header">
          <div className="group-sidebar__header-top">
            <span className="group-sidebar__header-name">Группы</span>
            <Button
              disabled={status.groups.isLoading || status.groups.isError}
              icon={Plus}
              variant={"secondary"}
              onClick={() => open("group-create")}
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
      </div>
      <div className="page-split__content">
        <QueryState
          isLoading={status.selected.isLoading}
          isError={status.selected.isError}
          isEmpty={!selected}
          emptyText="Выберите группу"
        >
          <div className="group-details">
            <div className="group-details__title">
              <span className="group-details__title-name">{selected?.name}</span>
              <span className="group-details__title-description">{selected?.description}</span>
              <div className="group-details__title-info">
                <span>{formatDate(selected?.created_at)}</span>
                <span>{selected?.standards.length} эталонов</span>
                <span>
                  {selected?.standards.reduce((count, s) => count + s.segment_count, 0)} сегментов
                </span>
              </div>
            </div>
            <div className="group-details__actions">
              <Button variant={"danger"} onClick={() => open("group-delete")}>
                Удалить
              </Button>
              <Button variant={"secondary"} onClick={() => open("group-update")}>
                Изменить
              </Button>
            </div>
          </div>
          <div className="group-standards-card">
            <div className="group-standards-card__header">
              <span>ЭТАЛОНЫ &middot; {selected?.standards.length}</span>
              <Button variant={"secondary"} onClick={() => open("standard-create")}>
                Добавить эталон
              </Button>
            </div>
            <div className="group-standards-card__body">
              {selected?.standards.map((standard) => (
                <StandardItem
                  key={standard.id}
                  standard={standard}
                  onEdit={() => open("standard-update", standard)}
                  onDelete={() => open("standard-delete", standard)}
                  onDeactivate={() => {
                    updateStandard.mutate({ id: standard.id, is_active: !standard.is_active });
                  }}
                />
              ))}
            </div>
          </div>
        </QueryState>
      </div>

      {modal?.type === "group-create" && (
        <GroupFormModal
          isPending={create.isPending}
          onClose={close}
          onSubmit={({ name, description }) =>
            create.mutate(
              { name, description },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Создать группу`}
          submitText="Создать"
        />
      )}

      {modal?.type === "group-update" && (
        <GroupFormModal
          isPending={update.isPending}
          onClose={close}
          onSubmit={({ name, description }) =>
            update.mutate(
              { id: selectedId, name, description },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Изменить группу ${selected.name}`}
          submitText="Сохранить"
          initialName={selected.name}
          initialDescription={selected.description}
        />
      )}

      {modal?.type === "group-delete" && (
        <DeleteModal
          entityLabel="группу"
          name={selected.name}
          isPending={remove.isPending}
          onClose={close}
          onDelete={() =>
            remove.mutate(selectedId, {
              onSuccess: () => {
                navigate("/groups");
                close();
              },
            })
          }
        />
      )}

      {modal?.type === "standard-create" && (
        <StandardCreateModal
          isPending={createStandard.isPending}
          onClose={close}
          onSubmit={({ name, image, angle }) =>
            createStandard.mutate(
              { selectedId, name, image, angle },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Добавить эталон`}
          submitText="Добавить"
        />
      )}

      {modal?.type === "standard-update" && (
        <StandardUpdateModal
          isPending={updateStandard.isPending}
          onClose={close}
          onSubmit={({ name, angle }) =>
            updateStandard.mutate(
              { id: modal.data.id, name, angle },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Изменить эталон ${modal.data.name}`}
          submitText="Сохранить"
          initialName={modal.data.name}
          initialAngle={modal.data.angle}
        />
      )}

      {modal?.type === "standard-delete" && (
        <DeleteModal
          entityLabel="эталон"
          name={modal.data.name}
          isPending={removeStandard.isPending}
          onClose={close}
          onDelete={() =>
            removeStandard.mutate(modal.data.id, {
              onSuccess: () => {
                close();
              },
            })
          }
        />
      )}
    </div>
  );
}
