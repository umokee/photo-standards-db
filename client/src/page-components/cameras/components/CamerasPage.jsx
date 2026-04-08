import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DeleteModal from "../../components/DeleteModal";
import QueryState from "../../../components/ui/query-state";
import useCameras from "../../../hooks/useCameras";
import useModal from "../../hooks/useModal";
import CameraDetails from "../../../pages/cameras/CameraDetails";
import CameraFormModal from "../../../pages/cameras/CameraFormModal";
import CameraSidebar from "../../../pages/cameras/CameraSidebar";

export default function CamerasPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const selectedId = id ?? null;
  const { modal, open, close } = useModal();
  const { cameras, status, create, update, remove } = useCameras(selectedId);
  const selected = useMemo(() => cameras?.find((c) => c.id === selectedId), [cameras, selectedId]);

  return (
    <div className="split">
      <div className="split__sidebar">
        <CameraSidebar
          cameras={cameras}
          selectedId={selectedId}
          status={status}
          onAdd={() => open("camera-create")}
        />
      </div>
      <QueryState
        isLoading={status.isLoading}
        isError={status.isError}
        isEmpty={!selected}
        emptyText="Выберите камеру"
      >
        <div className="split__content">
          <CameraDetails
            camera={selected}
            onEdit={() => open("camera-update")}
            onDelete={() => open("camera-delete")}
          />
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
                navigate();
                close();
              },
            })
          }
        />
      )}
    </div>
  );
}
