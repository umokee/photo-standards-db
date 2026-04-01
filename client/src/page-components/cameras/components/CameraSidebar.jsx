import { Plus, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/button";
import QueryState from "../../../components/ui/query-state";

export default function CameraSidebar({ cameras, selectedId, status, onAdd }) {
  const navigate = useNavigate();

  return (
    <>
      <div className="camera-sidebar__header">
        <span className="camera-sidebar__header-name">Камеры</span>
        <Button
          disabled={status.isLoading || status.isError}
          icon={Plus}
          variant={"ghost"}
          onClick={onAdd}
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
                <div className="camera-sidebar__body-item-info-description">{camera.location}</div>
              </div>
            </div>
          ))}
        </QueryState>
      </div>
    </>
  );
}
