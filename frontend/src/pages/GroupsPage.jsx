import { Plus } from "lucide-react";
import { useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import "../styles/GroupsPage.css";

const mock = [
  {
    id: 1,
    name: "Группа 1",
    description: "Описание группы 1",
    members: 10,
    photos: 100,
  },
  {
    id: 2,
    name: "Группа 2",
    description: "Описание группы 2",
    standards_count: 10,
    photos: 100,
  },
];

export default function GroupsPage() {
  const [showAdd, setShowAdd] = useState(false);
  // const [showEdit, setShowEdit] = useState(false);
  // const [showDelete, setShowDelete] = useState(false);

  const [groups, setGroups] = useState(mock);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  const selected = groups.find((g) => g.id === selectedGroup?.id);

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
                className={`group-item ${selectedGroup?.id === group.id ? "selected" : ""}`}
                onClick={() => setSelectedGroup(group)}
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
        <div className="groups-details"></div>
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
              <Button variant={"primary"} onClick={() => setShowAdd(false)}>
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
    </div>
  );
}
