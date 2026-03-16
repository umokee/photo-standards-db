import { ArrowLeft, MousePointer2, Move, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SegmentItem from "../components/items/SegmentItem";
import DeleteModal from "../components/modals/DeleteModal";
import SegmentFormModal from "../components/modals/SegmentFormModal";
import useGroups from "../hooks/useGroups";
import useModal from "../hooks/useModal";
import useStandards from "../hooks/useStandards";
import StandardCanvas from "../pages/StandardCanvas";
import { BASE_URL } from "../utils/constants";

export default function StandardDetailPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("view");
  const [selectedId, setSelectedId] = useState(null);
  const { id } = useParams();
  const { selected: standard, segment } = useStandards(id);
  const { selected: group } = useGroups(standard?.group_id);
  const { modal, open, close } = useModal();
  const angles = useMemo(
    () =>
      group?.standards.reduce((angles, s) => {
        (angles[s.angle] ??= []).push(s);
        return angles;
      }, {}),
    [group]
  );

  return (
    <div className="standard-detail-page">
      <div className="standard-detail-page__header">
        <div className="standard-detail-page__header-actions">
          <button
            className="standard-detail-page__header-actions-back-btn"
            onClick={() => navigate(`/groups/${standard?.group_id}`)}
          >
            <ArrowLeft size={16} />
            <span>{group?.name}</span>
          </button>
          <div className="standard-detail-page__header-actions-change-angle">
            {angles &&
              Object.entries(angles).map(([angle, standards]) =>
                standards.map((s, i) => (
                  <button
                    key={s.id}
                    className={`standard-detail-page__header-actions-change-angle-item${s.id === id ? " standard-detail-page__header-actions-change-angle-item--active" : ""}`}
                    onClick={() => navigate(`/standards/${s.id}`)}
                  >
                    {angle}
                    {standards.length > 1 ? ` #${i + 1}` : ""}
                  </button>
                ))
              )}
          </div>
        </div>
        <div className="standard-detail-page__header-info">
          <div className="standard-detail-page__header-info-modes">
            <button
              className={`standard-detail-page__header-info-modes-item${mode === "view" ? " standard-detail-page__header-info-modes-item--active" : ""}`}
              onClick={() => setMode("view")}
            >
              <MousePointer2 size={16} />
            </button>
            <button
              className={`standard-detail-page__header-info-modes-item${mode === "draw" ? " standard-detail-page__header-info-modes-item--active" : ""}`}
              onClick={() => setMode("draw")}
            >
              <Pencil size={16} />
            </button>
            <button
              className={`standard-detail-page__header-info-modes-item${mode === "move" ? " standard-detail-page__header-info-modes-item--active" : ""}`}
              onClick={() => setMode("move")}
            >
              <Move size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="standard-detail-page__body">
        <StandardCanvas
          imageUrl={standard ? `${BASE_URL}/storage/${standard.image_path}` : null}
          segments={standard?.segments ?? []}
          selectedId={selectedId}
          mode={mode}
          onCreate={(points, pos) => {
            open("create", { points, ...pos });
          }}
          onSelect={(id) => {
            setSelectedId(id);
            close();
          }}
          onDoubleClick={(segment, pos) => {
            open("update", { segment, ...pos });
          }}
          onUpdate={(id, data) => {
            segment.update.mutate({ id, ...data });
          }}
        />
      </div>
      <div className="standard-detail-page__footer">
        {standard?.segments.map((segment) => (
          <SegmentItem
            key={segment.id}
            segment={segment}
            isSelected={segment.id === selectedId}
            onClick={() => setSelectedId(segment.id)}
          />
        ))}
      </div>

      {modal?.type === "create" && (
        <SegmentFormModal
          screenX={modal.data.screenX}
          screenY={modal.data.screenY}
          isPending={segment.create.isPending}
          onClose={close}
          onSubmit={({ label, isCritical, confidenceThreshold }) => {
            segment.create.mutate(
              {
                standard_id: standard.id,
                label,
                is_critical: isCritical,
                confidence_threshold: confidenceThreshold,
                points: modal.data.points,
              },
              {
                onSuccess: () => close(),
              }
            );
          }}
          submitText="Создать"
        />
      )}

      {modal?.type === "update" && (
        <SegmentFormModal
          screenX={modal.data.screenX}
          screenY={modal.data.screenY}
          isPending={segment.update.isPending}
          onDelete={() => open("delete", { segment: modal.data.segment })}
          onClose={close}
          onSubmit={({ label, isCritical, confidenceThreshold }) => {
            segment.update.mutate(
              {
                id: modal.data.segment.id,
                label,
                is_critical: isCritical,
                confidence_threshold: confidenceThreshold,
              },
              {
                onSuccess: () => close(),
              }
            );
          }}
          submitText="Сохранить"
          initialLabel={modal.data.segment.label}
          initialIsCritical={modal.data.segment.is_critical}
          initialConfidenceThreshold={modal.data.segment.confidence_threshold}
        />
      )}

      {modal?.type === "delete" && (
        <DeleteModal
          entityLabel="сегмент"
          name={modal.data.segment.label}
          isPending={segment.remove.isPending}
          onClose={close}
          onDelete={() =>
            segment.remove.mutate(modal.data.segment.id, {
              onSuccess: () => {
                setSelectedId(null);
                close();
              },
            })
          }
        />
      )}
    </div>
  );
}
