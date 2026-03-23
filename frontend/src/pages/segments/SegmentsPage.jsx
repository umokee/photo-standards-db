import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/Button";
import useGroups from "../../hooks/useGroups";
import useModal from "../../hooks/useModal";
import useSegmentGroups from "../../hooks/useSegmentGroups";
import useSegments from "../../hooks/useSegments";
import useStandardDetail from "../../hooks/useStandardDetail";
import useStandardImages from "../../hooks/useStandardImages";
import { BASE_URL } from "../../utils/constants";
import Canvas from "./Canvas";
import SegmentSidebar from "./SegmentSidebar";

export default function SegmentsPage() {
  const navigate = useNavigate();
  const { standardId = null, imageId = null } = useParams();
  const { modal, open, close } = useModal();

  const { standard } = useStandardDetail(standardId, { enabled: true });
  const { group } = useGroups(standard?.group_id);
  const { image } = useStandardImages(imageId, standardId);

  const segmentGroups = standard?.segment_groups ?? [];
  const segments = image?.segments ?? [];

  const { create: createSegGroup } = useSegmentGroups(standardId);
  const {
    create: createSegment,
    update: updateSegment,
    annotate,
    refine,
    remove: removeSegment,
  } = useSegments(imageId, standardId);

  const [selectedSegmentId, setSelectedSegmentId] = useState(null);

  const angles = useMemo(
    () =>
      group?.standards.reduce((angles, s) => {
        (angles[s.angle] ??= []).push(s);
        return angles;
      }, {}),
    [group]
  );

  const imageUrl = image ? `${BASE_URL}/storage/${image.image_path}` : null;

  const handleFinishDrawing = (points) => {
    if (!selectedSegmentId) return;
    refine.mutate(
      { imageId, points },
      {
        onSuccess: (data) => {
          annotate.mutate({
            segmentId: selectedSegmentId,
            imageId,
            points: data.points,
          });
        },
        onError: () => {
          annotate.mutate({ segmentId: selectedSegmentId, imageId, points });
        },
      }
    );
  };

  const handlePointsChange = (segmentId, points) => {
    annotate.mutate({ segmentId, imageId, points });
  };

  const handleSelect = (segmentId) => {
    setSelectedSegmentId(segmentId);
  };

  const handleAddGroup = ({ name, hue }) => {
    createSegGroup.mutate({ standardId, name, hue: Number(hue) });
  };

  const handleAddSegment = ({ segmentGroupId, label }) => {
    if (!standardId) return;
    createSegment.mutate({ standardId, segmentGroupId, label });
  };

  const handleDeleteSegment = (segment) => {
    if (selectedSegmentId === segment.id) setSelectedSegmentId(null);
    removeSegment.mutate(segment.id);
  };

  const handleRefine = () => {
    const seg = segments.find((s) => s.id === selectedSegmentId);
    if (!seg?.points?.length) return;

    refine.mutate(
      { imageId, points: seg.points },
      {
        onSuccess: (data) => {
          annotate.mutate({
            segmentId: selectedSegmentId,
            imageId,
            points: data.points,
          });
        },
      }
    );
  };

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
                    className={`standard-detail-page__header-actions-change-angle-item${s.id === standardId ? " standard-detail-page__header-actions-change-angle-item--active" : ""}`}
                    onClick={() => navigate(`/standards/${s.id}`)}
                  >
                    {angle}
                    {standards.length > 1 ? ` #${i + 1}` : ""}
                  </button>
                ))
              )}
          </div>
          {selectedSegmentId &&
            segments.find((s) => s.id === selectedSegmentId)?.points?.length > 0 && (
              <Button onClick={handleRefine} disabled={refine.isPending}>
                {refine.isPending ? "Уточняю..." : "Уточнить"}
              </Button>
            )}
        </div>
      </div>
      <div className="standard-detail-page__body">
        <div className="standard-detail-page__body-content">
          <Canvas
            imageUrl={imageUrl}
            segments={segments}
            segmentGroups={segmentGroups}
            selectedId={selectedSegmentId}
            onFinishDrawing={handleFinishDrawing}
            onSelect={handleSelect}
            onPointsChange={handlePointsChange}
          />
        </div>
        <SegmentSidebar
          segmentGroups={segmentGroups}
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={(segment) => setSelectedSegmentId(segment.id)}
          onAddGroup={handleAddGroup}
          onAddSegment={handleAddSegment}
          onDeleteSegment={handleDeleteSegment}
        />
      </div>
    </div>
  );
}
