import { Plus, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import "../styles/CamerasPage.css";

const mock = [
  {
    id: 1,
    name: "Камера 1",
    location: "Место 1",
    isActive: false,
    lastSeen: "Дата",
    url: "URL",
    resolution: "1080p",
  },
];

export default function CamerasPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  const [cameras, setCameras] = useState(mock);
  const [selectedCamera, setSelectedCamera] = useState(null);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [location, setLocation] = useState("");

  const selected = cameras.find((c) => c.id === selectedCamera?.id);

  return (
    <div className="camera-layout">
      <div className="camera-sidebar">
        <div className="camera-header">
          <span className="camera-header-title">Камеры</span>
          <Button icon={Plus} variant={"secondary"} onClick={() => setShowAdd(true)} />
        </div>

        {cameras.length > 0 ? (
          <div className="camera-list">
            {cameras.map((camera) => (
              <div
                className={`camera-item ${selectedCamera?.id === camera.id ? "selected" : ""}`}
                onClick={() => setSelectedCamera(camera)}
                key={camera.id}
              >
                <div className={`camera-item-status ${camera.isActive ? "active" : ""}`}>
                  {camera.isActive ? <Wifi /> : <WifiOff />}
                </div>
                <div className="camera-item-labels">
                  <div className="camera-item-title">{camera.name}</div>
                  <div className="camera-item-description">{camera.location}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="camera-list-empty">Нет камер</div>
        )}
      </div>

      {selected ? (
        <div className="camera-details">
          <div className="camera-preview"></div>
          <div className="camera-panel">
            <div className="camera-info">
              <div>
                <span className="camera-info-label">Название: </span>
                <span>{selected.name}</span>
              </div>
              <div>
                <span className="camera-info-label">URL: </span>
                <span>{selected.url}</span>
              </div>
              <div>
                <span className="camera-info-label">Расположение: </span>
                <span>{selected.location}</span>
              </div>
              <div>
                <span className="camera-info-label">Разрешение: </span>
                <span>{selected.resolution}</span>
              </div>
              <div>
                <span className="camera-info-label">Последняя связь: </span>
                <span>{selected.lastSeen}</span>
              </div>
              <div>
                <span className="camera-info-label">Статус: </span>
                <span>{selected.isActive ? "Активна" : "Неактивна"}</span>
              </div>
            </div>
            <div className="camera-actions">
              <Button variant={"secondary"} onClick={() => setShowCheck(true)}>
                Проверить
              </Button>
              <Button variant={"secondary"} onClick={() => setShowEdit(true)}>
                Изменить
              </Button>
              <Button variant={"danger"} onClick={() => setShowDelete(true)}>
                Удалить
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="camera-details-empty">Выберите камеру</div>
      )}

      {showAdd && (
        <Modal
          title={"Новая камера"}
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
            <Input label={"URL потока"} placeholder={"пример"} value={url} onChange={setUrl} />
            <Input
              label={"Расположение"}
              placeholder={"пример"}
              value={location}
              onChange={setLocation}
            />
          </div>
        </Modal>
      )}

      {showEdit && (
        <Modal
          title={`Изменить камеру ${selectedCamera?.name}`}
          onClose={() => setShowEdit(false)}
          footer={
            <>
              <Button variant={"secondary"} onClick={() => setShowEdit(false)}>
                Отмена
              </Button>
              <Button variant={"primary"} onClick={() => setShowEdit(false)}>
                Сохранить
              </Button>
            </>
          }
        >
          <div>
            <Input
              label={"Название"}
              placeholder={"пример"}
              value={selected.name}
              onChange={setName}
            />
            <Input
              label={"URL потока"}
              placeholder={"пример"}
              value={selected.url}
              onChange={setUrl}
            />
            <Input
              label={"Расположение"}
              placeholder={"пример"}
              value={selected.location}
              onChange={setLocation}
            />
          </div>
        </Modal>
      )}

      {showDelete && (
        <Modal
          title={`Удалить камеру ${selectedCamera?.name}`}
          onClose={() => setShowDelete(false)}
          footer={
            <>
              <Button variant={"secondary"} onClick={() => setShowDelete(false)}>
                Отмена
              </Button>
              <Button variant={"danger"} onClick={() => setShowDelete(false)}>
                Удалить
              </Button>
            </>
          }
        >
          <div>
            <div className="text-muted">
              Вы уверены, что хотите удалить камеру <b>{selectedCamera?.name}</b>?
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
