import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import QueryState from "@/components/ui/query-state/query-state";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { useAnnotateSegment } from "@/page-components/segments/api/annotate-segment";
import { useRefineContour } from "@/page-components/segments/api/refine-contour";
import Canvas from "@/page-components/segments/components/canvas-surface";
import { SegmentHeader } from "@/page-components/segments/components/segment-header/segment-header";
import { SegmentPanel } from "@/page-components/segments/components/segment-panel/segment-panel";
import { getImageQueryOptions, useGetImage } from "@/page-components/standards/api/get-image";
import { useGetStandardDetail } from "@/page-components/standards/api/get-standard";
import { StandardImageDetail } from "@/types/contracts";
import { BASE_URL } from "@/utils/constants";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "../paths";

export function Component() {
  const navigate = useNavigate();
  const { groupId, standardId, imageId } = useParams();

  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedContourIndex, setSelectedContourIndex] = useState<number | null>(null);
  const [isDrawMode, setIsDrawMode] = useState(false);

  if (!groupId || !standardId || !imageId) {
    <QueryState
      isEmpty
      size="page"
      emptyTitle="Некорректный адрес"
      emptyDescription="Не удалось определить группу, эталон или изображение"
    >
      {null}
    </QueryState>;
  }

  const groupQuery = useGetGroup(groupId);
  const standardQuery = useGetStandardDetail(standardId);
  const imageQuery = useGetImage(imageId);

  const qc = useQueryClient();
  const annotate = useAnnotateSegment({ standardId });
  const refine = useRefineContour();

  const group = groupQuery.data;
  const standard = standardQuery.data;
  const image = imageQuery.data;

  const isLoading = groupQuery.isPending || standardQuery.isPending || imageQuery.isPending;
  const isError = !!groupQuery.error || !!standardQuery.error || !!imageQuery.error;
  const isEmpty = !isLoading && !isError && (!group || !standard || !image);

  if (isLoading || isError || isEmpty) {
    return (
      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        size="page"
        loadingText="Загрузка изображения"
        errorTitle="Не удалось открыть изображение"
        errorDescription="Проверьте подключение или попробуйте перезагрузить страницу"
        emptyTitle="Изображение не найдено"
        emptyDescription="Вероятно, данные изображения или эталона больше недоступны"
      >
        {null}
      </QueryState>
    );
  }

  const segmentGroups = standard.segment_groups;
  const segments = standard.segments;
  const imageSegments = image.segments;
  const imageUrl = image ? `${BASE_URL}/storage/${image.image_path}` : null;
  const currentIndex = standard.images.findIndex((img) => img.id === image.id);
  const safeIndex = Math.max(currentIndex, 0);
  const prevImage = safeIndex > 0 ? standard.images[safeIndex - 1] : null;
  const nextImage =
    currentIndex < standard.images.length - 1 ? standard.images[safeIndex + 1] : null;
  const nextUnannotatedImage =
    standard.images.find((img, index) => index > safeIndex && img.annotation_count === 0) ?? null;

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

  const handlePointsChange = (segmentId: string, points: number[][][]) => {
    qc.setQueryData(
      getImageQueryOptions(imageId).queryKey,
      (old: StandardImageDetail | undefined) => {
        if (!old) return old;
        return {
          ...old,
          segments: old.segments.map((segment) =>
            segment.id === segmentId ? { ...segment, points } : segment
          ),
        };
      }
    );

    annotate.mutate({ segmentId, imageId, points });
  };

  const handleFinishDrawing = (points: number[][]) => {
    if (!selectedSegmentId) return;

    setIsDrawMode(false);

    const existing =
      imageSegments.find((segment) => segment.id === selectedSegmentId)?.points ?? [];
    setSelectedContourIndex(existing.length);

    const save = (nextPoints: number[][]) => {
      annotate.mutate({
        segmentId: selectedSegmentId,
        imageId,
        points: [...existing, nextPoints],
      });
    };

    refine.mutate(
      { imageId, points },
      {
        onSuccess: (data) => save(data.points),
        onError: () => save(points),
      }
    );
  };

  const handleRefine = () => {
    const imageSegment = imageSegments.find((segment) => segment.id === selectedSegmentId);

    if (!imageSegment?.points?.length || selectedContourIndex === null) return;

    const contour = imageSegment.points[selectedContourIndex];

    refine.mutate(
      { imageId, points: contour },
      {
        onSuccess: (data) => {
          const newPoints = imageSegment.points.map((pointSet, index) =>
            index === selectedContourIndex ? data.points : pointSet
          );

          annotate.mutate({
            segmentId: selectedSegmentId!,
            imageId,
            points: newPoints,
          });
        },
      }
    );
  };

  const handleDeleteContour = (contourIndex: number) => {
    const imageSegment = imageSegments.find((segment) => segment.id === selectedSegmentId);
    if (!imageSegment) return;

    const newPoints = imageSegment.points.filter((_, index) => index !== contourIndex);

    annotate.mutate({
      segmentId: selectedSegmentId!,
      imageId,
      points: newPoints,
    });

    setSelectedContourIndex(null);
  };

  return (
    <SplitLayout>
      <SplitLayout.Content>
        <SplitLayout.Topbar>
          <SegmentHeader
            standardName={standard.name}
            currentIndex={safeIndex}
            totalImages={standard.stats.images_count}
            isReference={image.is_reference}
            isCurrentAnnotated={image.annotation_count > 0}
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
