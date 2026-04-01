import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { useAnnotateSegment } from "@/page-components/segments/api/annotate-segment";
import { useRefineContour } from "@/page-components/segments/api/refine-contour";
import Canvas from "@/page-components/segments/components/canvas-surface";
import { SegmentPanel } from "@/page-components/segments/components/segment-panel";
import { getImageQueryOptions, useGetImage } from "@/page-components/standards/api/get-image";
import { useGetStandardDetail } from "@/page-components/standards/api/get-standard";
import { StandardImageDetail } from "@/types/api";
import { BASE_URL } from "@/utils/constants";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function Component() {
  const navigate = useNavigate();
  const { groupId = null, standardId = null, imageId = null } = useParams();
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedContourIndex, setSelectedContourIndex] = useState<number | null>(null);

  const { data: group } = useGetGroup(groupId);
  const { data: standard } = useGetStandardDetail(standardId);
  const { data: image } = useGetImage(imageId);

  const qc = useQueryClient();
  const annotate = useAnnotateSegment({ standardId });
  const refine = useRefineContour();
  const [isDrawMode, setIsDrawMode] = useState(false);

  const segmentGroups = standard?.segment_groups ?? [];
  const segments = standard?.segments ?? [];
  const imageSegments = image?.segments ?? [];
  const imageUrl = image ? `${BASE_URL}/storage/${image.image_path}` : null;

  const handleBack = () => navigate(`/groups/${group?.id ?? ""}`);

  const handlePointsChange = (segmentId: string, points: number[][][]) => {
    qc.setQueryData(getImageQueryOptions(imageId).queryKey, (old: StandardImageDetail) => {
      if (!old) return old;
      return {
        ...old,
        segments: old.segments.map((s) => (s.id === segmentId ? { ...s, points } : s)),
      };
    });
    annotate.mutate({ segmentId, imageId, points });
  };

  const handleFinishDrawing = (points: number[][]) => {
    if (!selectedSegmentId) return;
    setIsDrawMode(false);
    const existing = imageSegments.find((s) => s.id === selectedSegmentId)?.points ?? [];
    setSelectedContourIndex(existing.length);
    const save = (pts: number[][]) =>
      annotate.mutate({ segmentId: selectedSegmentId, imageId, points: [...existing, pts] });
    refine.mutate(
      { imageId, points },
      { onSuccess: (data) => save(data.points), onError: () => save(points) }
    );
  };

  const handleRefine = () => {
    const imgSeg = imageSegments.find((s) => s.id === selectedSegmentId);
    if (!imgSeg?.points?.length || selectedContourIndex === null) return;
    const contour = imgSeg.points[selectedContourIndex];
    refine.mutate(
      { imageId, points: contour },
      {
        onSuccess: (data) => {
          const newPoints = imgSeg.points.map((p, i) =>
            i === selectedContourIndex ? data.points : p
          );
          annotate.mutate({ segmentId: selectedSegmentId, imageId, points: newPoints });
        },
      }
    );
  };

  const handleDeleteContour = (contourIndex: number) => {
    const imgSeg = imageSegments.find((s) => s.id === selectedSegmentId);
    if (!imgSeg) return;
    const newPoints = imgSeg.points.filter((_, i) => i !== contourIndex);
    annotate.mutate({ segmentId: selectedSegmentId, imageId, points: newPoints });
    setSelectedContourIndex(null);
  };

  return (
    <SplitLayout>
      <SplitLayout.Content>
        <SplitLayout.Topbar>
          <button className="back-btn" onClick={handleBack}>
            <ArrowLeft size={16} />
            <span>{group?.name ?? "Назад"}</span>
          </button>
        </SplitLayout.Topbar>
        <SplitLayout.Body bare>
          <Canvas
            imageUrl={imageUrl}
            segmentGroups={segmentGroups}
            segments={imageSegments}
            selectedId={selectedSegmentId}
            onSelect={setSelectedSegmentId}
            onPointsChange={handlePointsChange}
            onFinishDrawing={handleFinishDrawing}
            isDrawMode={isDrawMode}
            onCancelDraw={() => setIsDrawMode(false)}
            selectedContourIndex={selectedContourIndex}
            onSelectContour={setSelectedContourIndex}
          />
        </SplitLayout.Body>
      </SplitLayout.Content>
      <SplitLayout.Panel>
        <SegmentPanel
          standard={standard}
          segments={segments}
          segmentGroups={segmentGroups}
          imageSegments={imageSegments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={setSelectedSegmentId}
          onStartDraw={() => setIsDrawMode(true)}
          onRefine={handleRefine}
          isRefining={refine.isPending || annotate.isPending}
          selectedContourIndex={selectedContourIndex}
          onSelectContour={setSelectedContourIndex}
          onDeleteContour={handleDeleteContour}
        />
      </SplitLayout.Panel>
    </SplitLayout>
  );
}
