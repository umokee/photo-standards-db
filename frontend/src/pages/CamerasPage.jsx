import { Plus, Wifi, WifiOff } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import CameraFormModal from "../components/modals/CameraFormModal";
import DeleteModal from "../components/modals/DeleteModal";
import QueryState from "../components/QueryState";
import useCameras from "../hooks/useCameras";
import useModal from "../hooks/useModal";
import { formatDate } from "../utils/format";

export default function CamerasPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const selectedId = id ?? null;
  const { modal, open, close } = useModal();
  const { cameras, status, create, update, remove } = useCameras(selectedId);
  const selected = useMemo(() => cameras?.find((c) => c.id === selectedId), [cameras, selectedId]);

  return (
    <div className="page-split">
      <div className="page-split__sidebar">
        <div className="camera-sidebar__header">
          <span className="camera-sidebar__header-name">Камеры</span>
          <Button
            disabled={status.isLoading || status.isError}
            icon={Plus}
            variant={"secondary"}
            onClick={() => open("camera-create")}
          />
        </div>
        <div className="camera-sidebar__body">
          <QueryState
            isLoading={status.isLoading}
            isError={status.isError}
            isEmpty={!cameras.length}
            emptyText="Нет камер"
          >
            {cameras.map((camera) => (
              <div
                key={camera.id}
                className={`camera-sidebar__body-item ${selectedId === camera.id ? "selected" : ""}`}
                onClick={() => navigate(`/cameras/${camera.id}`)}
              >
                <div
                  className={`camera-sidebar__body-item-status ${camera.is_active ? "active" : ""}`}
                >
                  {camera.is_active ? <Wifi /> : <WifiOff />}
                </div>
                <div className="camera-sidebar__body-item-info">
                  <div className="camera-sidebar__body-item-info-name">{camera.name}</div>
                  <div className="camera-sidebar__body-item-info-description">
                    {camera.location}
                  </div>
                </div>
              </div>
            ))}
          </QueryState>
        </div>
      </div>
      <QueryState
        isLoading={status.isLoading}
        isError={status.isError}
        isEmpty={!selected}
        emptyText="Выберите камеру"
      >
        <div className="page-split__content">
          <div className="camera-preview"></div>
          <div className="camera-card">
            <div className="camera-card__body">
              <div>
                <span className="camera-card__body-name">Название: </span>
                <span>{selected?.name}</span>
              </div>
              <div>
                <span className="camera-card__body-name">URL: </span>
                <span>{selected?.url}</span>
              </div>
              <div>
                <span className="camera-card__body-name">Расположение: </span>
                <span>{selected?.location}</span>
              </div>
              {/* ???????? */}
              {/* <div>
                <span className="camera-card__body-name">Разрешение: </span>
                <span>{selected.resolution}</span>
              </div> */}
              <div>
                <span className="camera-card__body-name">Последняя связь: </span>
                <span>{selected?.last_seen_at ? formatDate(selected?.last_seen_at) : "-"}</span>
              </div>
              <div>
                <span className="camera-card__body-name">Статус: </span>
                <span>{selected?.is_active ? "Активна" : "Неактивна"}</span>
              </div>
            </div>
            <div className="camera-card__footer">
              <Button disabled>Проверить</Button>
              <Button variant={"secondary"} onClick={() => open("camera-update")}>
                Изменить
              </Button>
              <Button variant={"danger"} onClick={() => open("camera-delete")}>
                Удалить
              </Button>
            </div>
          </div>
        </div>
      </QueryState>

      {modal?.type === "camera-create" && (
        <CameraFormModal
          isPending={create.isPending}
          onClose={close}
          onSubmit={({ name, url, location }) =>
            create.mutate(
              { name, url, location },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Создать камеру`}
          submitText="Создать"
        />
      )}

      {modal?.type === "camera-update" && (
        <CameraFormModal
          isPending={update.isPending}
          onClose={close}
          onSubmit={({ name, url, location }) =>
            update.mutate(
              { id: selected.id, name, url, location },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Изменить камеру ${selected.name}`}
          submitText="Сохранить"
          initialName={selected.name}
          initialUrl={selected.url}
          initialLocation={selected.location}
        />
      )}

      {modal?.type === "camera-delete" && (
        <DeleteModal
          entityLabel="камеру"
          name={selected.name}
          isPending={remove.isPending}
          onClose={() => close()}
          onDelete={() =>
            remove.mutate(selectedId, {
              onSuccess: () => {
                navigate("/cameras");
                close();
              },
            })
          }
        />
      )}
    </div>
  );
}
