import { Edit, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { roleLabel } from "@/utils/labels";
import DeleteModal from "../../components/DeleteModal";
import Button from "../../components/ui/button.tsx";
import Input from "../../components/ui/input.tsx";
import QueryState from "../../components/ui/query-state.tsx";
import useModal from "../../hooks/useModal.ts";
import useUsers from "../../hooks/useUsers.ts";
import UserCreateModal from "./UserCreateModal.jsx";
import UserUpdateModal from "./UserUpdateModal.jsx";

const SETTINGS_TABS = [
  { value: "users", label: "Пользователи" },
  { value: "system", label: "Система" },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const tab = tabParam ?? "users";
  const { users, status, create, update, remove } = useUsers();
  const { modal, open, close } = useModal();
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase())),
    [users, search]
  );

  return (
    <div className="page">
      <div className="settings__name">Настройки</div>
      <div className="settings__tabs">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.value}
            className={`settings__tabs-tab ${tab === t.value ? "active" : ""}`}
            onClick={() => navigate(`/settings/${t.value}`)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="settings__body">
        {tab === "users" && (
          <div className="users-card">
            <div className="users-card__header">
              <Input placeholder="Поиск..." value={search} onChange={setSearch} />
              <Button
                disabled={status.isError || status.isLoading}
                onClick={() => open("user-create")}
              >
                Новый пользователь
              </Button>
            </div>
            <div className="users-card__body">
              <QueryState
                isLoading={status.isLoading}
                isError={status.isError}
                isEmpty={!filtered.length}
                emptyText="Нет пользователей"
              >
                {filtered.map((user) => (
                  <div key={user.id} className="users-card__body-item">
                    <div>{user.username}</div>
                    <div>{user.full_name}</div>
                    <div>{roleLabel(user.role)}</div>
                    <div>{user.created_at}</div>
                    <div>{user.is_active ? "Активен" : "Неактивен"}</div>
                    <Button
                      icon={Edit}
                      variant={"secondary"}
                      onClick={() => open("user-update", user)}
                    />
                    <Button
                      icon={Trash}
                      variant={"danger"}
                      onClick={() => open("user-delete", user)}
                    />
                  </div>
                ))}
              </QueryState>
            </div>
          </div>
        )}
        {tab === "system" && <div>Систeма</div>}
      </div>

      {modal?.type === "user-create" && (
        <UserCreateModal
          isPending={create.isPending}
          onClose={close}
          onSubmit={({ username, fullName, password, role }) =>
            create.mutate(
              { username, full_name: fullName, password, role },
              {
                onSuccess: () => close(),
              }
            )
          }
        />
      )}

      {modal?.type === "user-update" && (
        <UserUpdateModal
          isPending={update.isPending}
          onClose={close}
          onSubmit={({ username, fullName, password, role }) =>
            update.mutate(
              { id: modal.data.id, username, full_name: fullName, password, role },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Изменить пользователя ${modal.data.full_name}`}
          initialUsername={modal.data.username}
          initialFullName={modal.data.full_name}
          initialRole={modal.data.role}
        />
      )}

      {modal?.type === "user-delete" && (
        <DeleteModal
          entityLabel="пользователя"
          name={modal.data.username}
          isPending={remove.isPending}
          onClose={close}
          onDelete={() => remove.mutate(modal.data.id, { onSuccess: () => close() })}
        />
      )}
    </div>
  );
}
