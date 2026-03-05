import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createGroup, deleteGroup, getGroups, updateGroup } from "../api/groups";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import "../styles/GroupsPage.css";

export default function GroupsPage() {
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [selectedId, setSelectedId] = useState(null);

  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const {
    data: groups = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setName("");
      setDescription("");
      setShowAdd(false);
    },
    onError: (error) => {
      alert(`Не удалось создать группу: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setName("");
      setDescription("");
      setShowEdit(false);
    },
    onError: (error) => {
      alert(`Не удалось обновить группу: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowDelete(false);
    },
    onError: (error) => {
      alert(`Не удалось удалить группу: ${error.message}`);
    },
  });

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  const selected = groups.find((g) => g.id === selectedId);

  if (isLoading) return <div className="groups-list-empty">Загрузка...</div>;
  if (isError) return <div className="groups-list-empty">Ошибка загрузки данных</div>;

  return (
    <div className="groups-layout">
      <div className="groups-sidebar">
        <div className="groups-header">
          <div className="groups-header-top">
            <span className="groups-header-title">Группы</span>
            <Button icon={Plus} variant={"secondary"} onClick={() => setShowAdd(true)} />
          </div>
          <div className="groups-header-search">
            <Input placeholder={"Поиск..."} value={search} onChange={setSearch} />
          </div>
        </div>

        {groups.length > 0 ? (
          <div className="groups-list">
            {filtered.map((group) => (
              <div
                key={group.id}
                className={`group-item ${selectedId === group.id ? "selected" : ""}`}
                onClick={() => setSelectedId(group.id)}
              >
                <div className="group-item-title">{group.name}</div>
                <div className="group-item-description">{group.description}</div>
                <div className="group-item-stats"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="groups-list-empty">Нет групп</div>
        )}
      </div>

      {selected ? (
        <div className="groups-details">
          <div>
            <span className="groups-details-title">ЭТАЛОНЫ &middot;</span>
            <div className="groups-details-cameras">
              {selected.map}
            </div>
          </div>
        </div>
      ) : (
        <div className="groups-details-empty">Выберите группу</div>
      )}

      {showAdd && (
        <Modal
          title={"Новая группа"}
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <Button variant={"secondary"} onClick={() => setShowAdd(false)}>
                Отмена
              </Button>
              <Button
                variant={"primary"}
                onClick={() => createMutation.mutate({ name, description })}
              >
                Создать
              </Button>
            </>
          }
        >
          <div>
            <Input label={"Название"} placeholder={"пример"} value={name} onChange={setName} />
            <Input
              label={"Описание"}
              placeholder={"пример"}
              value={description}
              onChange={setDescription}
            />
          </div>
        </Modal>
      )}

      {showEdit && (
        <Modal
          title={`Изменить группу ${selected.name}`}
          onClose={() => setShowEdit(false)}
          footer={
            <>
              <Button variant={"secondary"} onClick={() => setShowEdit(false)}>
                Отмена
              </Button>
              <Button
                variant={"primary"}
                onClick={() => updateMutation.mutate({ id: selected.id, name, description })}
              >
                Сохранить
              </Button>
            </>
          }
        >
          <div>
            <Input label={"Название"} placeholder={"пример"} value={name} onChange={setName} />
            <Input
              label={"Описание"}
              placeholder={"пример"}
              value={description}
              onChange={setDescription}
            />
          </div>
        </Modal>
      )}

      {showDelete && (
        <Modal
          title={`Удалить группу ${selected.name}`}
          onClose={() => setShowDelete(false)}
          footer={
            <>
              <Button variant={"secondary"} onClick={() => setShowDelete(false)}>
                Отмена
              </Button>
              <Button variant={"danger"} onClick={() => deleteMutation.mutate(selectedId)}>
                Удалить
              </Button>
            </>
          }
        >
          <div>
            <div className="text-muted">
              Вы уверены, что хотите удалить группу <b>{selected.name}</b>?
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
