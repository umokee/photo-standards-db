import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { createCamera, deleteCamera, getCameras, updateCamera } from "../api/cameras";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import "../styles/CamerasPage.css";

export default function CamerasPage() {
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [selectedId, setSelectedId] = useState(null);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [location, setLocation] = useState("");

  const {
    data: cameras = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["cameras"],
    queryFn: getCameras,
    refetchInterval: 10000,
  });

  const selected = cameras.find((c) => c.id === selectedId);

  const createMutation = useMutation({
    mutationFn: createCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
      setSelectedId(null);
      setName("");
      setUrl("");
      setLocation("");
      setShowAdd(false);
    },
    onError: (error) => {
      alert(`Не удалось создать камеру: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
      setName("");
      setUrl("");
      setLocation("");
      setShowEdit(false);
    },
    onError: (error) => {
      alert(`Не удалось обновить камеру: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCamera,
    onSuccess: () => {
      queryClient.invalidateQueries(["cameras"]);
      setSelectedId(null);
      setShowDelete(false);
    },
    onError: (error) => {
      alert(`Не удалось удалить камеру: ${error.message}`);
    },
  });

  if (isLoading) return <div className="camera-list-empty">Загрузка...</div>;
  if (isError) return <div className="camera-list-empty">Ошибка загрузки данных</div>;

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
                className={`camera-item ${selectedId === camera.id ? "selected" : ""}`}
                onClick={() => setSelectedId(camera.id)}
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
              <Button variant={"ghost"}>Проверить</Button>
              <Button
                variant={"secondary"}
                onClick={() => {
                  setName(selected.name);
                  setUrl(selected.url);
                  setLocation(selected.location);
                  setShowEdit(true);
                }}
              >
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
              <Button
                variant={"primary"}
                onClick={() => createMutation.mutate({ name, url, location })}
              >
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
          title={`Изменить камеру ${selected.name}`}
          onClose={() => setShowEdit(false)}
          footer={
            <>
              <Button variant={"secondary"} onClick={() => setShowEdit(false)}>
                Отмена
              </Button>
              <Button
                variant={"primary"}
                onClick={() => updateMutation.mutate({ id: selected.id, name, url, location })}
              >
                Сохранить
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

      {showDelete && (
        <Modal
          title={`Удалить камеру ${selected.name}`}
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
              Вы уверены, что хотите удалить камеру <b>{selected.name}</b>?
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
