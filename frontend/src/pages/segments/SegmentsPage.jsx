import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SegmentItem from "../../components/items/SegmentItem";
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
    updateSegment.mutate({ id: selectedSegmentId, points });
  };

  const handlePointsChange = (segmentId, points) => {
    updateSegment.mutate({ id: segmentId, points });
  };

  const handleSelect = (segmentId) => {
    setSelectedSegmentId(segmentId);
  };

  const handleAddGroup = ({ name, hue }) => {
    createSegGroup.mutate({ standardId, name, hue: Number(hue) });
  };

  const handleAddSegment = ({ segmentGroupId, label }) => {
    if (!imageId) return;
    createSegment.mutate({ imageId, segmentGroupId, label, points: [] });
  };

  const handleDeleteSegment = (segment) => {
    if (selectedSegmentId === segment.id) setSelectedSegmentId(null);
    removeSegment.mutate(segment.id);
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

          <div>
            {standard?.segments?.map((segment) => (
              <SegmentItem
                key={segment.id}
                segment={segment}
                isSelected={segment.id === selectedSegmentId}
                onClick={() => setSelectedSegmentId(segment.id)}
              />
            ))}
          </div>
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
