import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import QueryState from "@/components/ui/query-state/query-state";
import { queryKeys } from "@/lib/query-keys";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { useAnnotateSegment } from "@/page-components/segments/api/annotate-segment";
import { useRefineContour } from "@/page-components/segments/api/refine-contour";
import Canvas from "@/page-components/segments/components/canvas-surface/canvas-surface";
import { SegmentHeader } from "@/page-components/segments/components/segment-header/segment-header";
import { SegmentPanel } from "@/page-components/segments/components/segment-panel/segment-panel";
import { useGetImage } from "@/page-components/standards/api/get-image";
import { useGetStandardDetail } from "@/page-components/standards/api/get-standard";
import { StandardImageDetail } from "@/types/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { paths } from "../../paths";
import { BASE_URL } from "@/lib/api-client";

export function Component() {
  const navigate = useNavigate();
  const { groupId, standardId, imageId } = useLoaderData();

  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedContourIndex, setSelectedContourIndex] = useState<number | null>(null);
  const [isDrawMode, setIsDrawMode] = useState(false);

  useEffect(() => {
    setSelectedSegmentId(null);
    setSelectedContourIndex(null);
    setIsDrawMode(false);
  }, [imageId]);

  const groupQuery = useGetGroup(groupId);
  const standardQuery = useGetStandardDetail(standardId);
  const imageQuery = useGetImage(imageId);

  const qc = useQueryClient();
  const annotate = useAnnotateSegment({ standardId });
  const refine = useRefineContour();

  const group = groupQuery.data;
  const standard = standardQuery.data;
  const image = imageQuery.data;
  const isError = groupQuery.isError || standardQuery.isError || imageQuery.isError;

  if (isError || !group || !standard || !image) {
    return (
      <QueryState
        isError={isError}
        isEmpty={!isError}
        size="page"
        errorTitle="Не удалось открыть изображение"
        errorDescription="Проверьте подключение или попробуйте перезагрузить страницу"
        emptyTitle="Изображение не найдено"
        emptyDescription="Данные изображения, эталона или группы недоступны"
      >
        {null}
      </QueryState>
    );
  }

  const segmentGroups = standard.segment_groups;
  const standardSegments = standard.segments;
  const annotatedSegments = image.segments;
  const isCurrentAnnotated = Number(image.annotation_count ?? 0) > 0;
  const imageUrl = `${BASE_URL}/storage/${image.image_path}`;
  const selectedImageSegment =
    annotatedSegments.find((segment) => segment.id === selectedSegmentId) ?? null;
  const currentIndex = standard.images.findIndex((img) => img.id === image.id);
  const safeIndex = Math.max(currentIndex, 0);
  const prevImage = safeIndex > 0 ? standard.images[safeIndex - 1] : null;
  const nextImage =
    currentIndex < standard.images.length - 1 ? standard.images[safeIndex + 1] : null;
  const nextUnannotatedImage =
    currentIndex < 0
      ? null
      : ([
          ...standard.images.slice(currentIndex + 1),
          ...standard.images.slice(0, currentIndex),
        ].find((img) => Number(img.annotation_count ?? 0) === 0) ?? null);

  const handleBack = () => navigate(paths.standardDetail(groupId, standardId));

  const goToImage = (imageId: string) => {
    navigate(paths.standardImage(groupId, standardId, imageId));
  };

  const handlePrev = () => {
    if (!prevImage) return;
    goToImage(prevImage.id);
  };

  const handleNext = () => {
    if (!nextImage) return;
    goToImage(nextImage.id);
  };

  const handleNextUnannotated = () => {
    if (!nextUnannotatedImage) return;
    goToImage(nextUnannotatedImage.id);
  };

  const saveSegmentContours = (segmentId: string, nextContours: number[][][]) => {
    qc.setQueryData(queryKeys.standards.image(imageId), (old: StandardImageDetail | undefined) => {
      if (!old) return old;
      return {
        ...old,
        segments: old.segments.map((segment) =>
          segment.id === segmentId ? { ...segment, points: nextContours } : segment
        ),
      };
    });

    annotate.mutate({ segmentId, imageId, points: nextContours });
  };

  const handleFinishDrawing = (draftContour: number[][]) => {
    if (!selectedSegmentId) return;

    setIsDrawMode(false);

    const existingContours = selectedImageSegment?.points ?? [];
    setSelectedContourIndex(existingContours.length);

    saveSegmentContours(selectedSegmentId, [...existingContours, draftContour]);
  };

  const handleRefine = () => {
    if (!selectedImageSegment?.points.length || selectedContourIndex === null) return;

    const selectedContour = selectedImageSegment.points[selectedContourIndex];

    refine.mutate(
      { imageId, points: selectedContour },
      {
        onSuccess: (data) => {
          const nextContours = selectedImageSegment.points.map((points, index) =>
            index === selectedContourIndex ? data.points : points
          );

          saveSegmentContours(selectedSegmentId!, nextContours);
        },
      }
    );
  };

  const handleDeleteContour = (contourIndex: number) => {
    if (!selectedImageSegment) return;

    const nextContours = selectedImageSegment.points.filter((_, index) => index !== contourIndex);

    saveSegmentContours(selectedSegmentId!, nextContours);
    setSelectedContourIndex(null);
  };

  const handleStartDraw = () => setIsDrawMode(true);
  const handleCancelDraw = () => setIsDrawMode(false);

  return (
    <SplitLayout>
      <SplitLayout.Content>
        <SplitLayout.Topbar>
          <SegmentHeader
            standardName={standard.name}
            currentIndex={safeIndex}
            totalImages={standard.stats.images_count}
            isReference={image.is_reference}
            isCurrentAnnotated={isCurrentAnnotated}
            segmentsCount={standard.stats.segments_count}
            canGoPrev={!!prevImage}
            canGoNext={!!nextImage}
            hasNextUnannotated={!!nextUnannotatedImage}
            onPrev={handlePrev}
            onNext={handleNext}
            onNextUnannotated={handleNextUnannotated}
            onBack={handleBack}
          />
        </SplitLayout.Topbar>

        <SplitLayout.Body bare>
          <Canvas
            imageUrl={imageUrl}
            segmentGroups={segmentGroups}
            segments={annotatedSegments}
            selectedId={selectedSegmentId}
            onSelect={setSelectedSegmentId}
            onPointsChange={saveSegmentContours}
            onFinishDrawing={handleFinishDrawing}
            isDrawMode={isDrawMode}
            onCancelDraw={handleCancelDraw}
            selectedContourIndex={selectedContourIndex}
            onSelectContour={setSelectedContourIndex}
          />
        </SplitLayout.Body>
      </SplitLayout.Content>

      <SplitLayout.Panel>
        <SegmentPanel
          standard={standard}
          segments={standardSegments}
          segmentGroups={segmentGroups}
          imageSegments={annotatedSegments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={setSelectedSegmentId}
          onStartDraw={handleStartDraw}
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
