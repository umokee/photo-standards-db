import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import { QueryBoundary } from "@/components/ui/query-boundary/query-boundary";
import { BASE_URL } from "@/lib/api-client";
import {
  AnnotateSegmentClassInput,
  annotateSegmentClassMutationKey,
  useAnnotateSegmentClass,
} from "@/page-components/segments/api/annotate-segment";
import { useRefineContour } from "@/page-components/segments/api/refine-contour";
import Canvas from "@/page-components/segments/components/canvas-surface/canvas-surface";
import { SegmentHeader } from "@/page-components/segments/components/segment-header/segment-header";
import { SegmentPanel } from "@/page-components/segments/components/segment-panel/segment-panel";
import { useGetImage } from "@/page-components/standards/api/get-image";
import { useGetStandardDetail } from "@/page-components/standards/api/get-standard";
import { useMutationState } from "@tanstack/react-query";
import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { paths } from "../../paths";

type LoaderData = {
  groupId: string;
  standardId: string;
  imageId: string;
};

type PendingAnnotation = {
  submittedAt: number;
  variables: AnnotateSegmentClassInput;
};

export function Component() {
  return (
    <QueryBoundary
      size="page"
      loadingText="Загрузка изображения..."
      errorTitle="Не удалось открыть изображение"
      errorDescription="Проверьте подключение или попробуйте перезагрузить страницу"
    >
      <ImagesContent />
    </QueryBoundary>
  );
}

const ImagesContent = () => {
  const navigate = useNavigate();
  const { groupId, standardId, imageId } = useLoaderData() as LoaderData;

  const [selectedSegmentClassId, setSelectedSegmentClassId] = useState<string | null>(null);
  const [selectedContourIndex, setSelectedContourIndex] = useState<number | null>(null);
  const [isDrawMode, setIsDrawMode] = useState(false);

  const { data: standard } = useGetStandardDetail(standardId);
  const { data: image } = useGetImage(imageId);

  const annotate = useAnnotateSegmentClass({ groupId, standardId });
  const refine = useRefineContour();
  const pendingAnnotations = useMutationState<PendingAnnotation>({
    filters: {
      mutationKey: annotateSegmentClassMutationKey,
      status: "pending",
    },
    select: (mutation) => ({
      submittedAt: mutation.state.submittedAt,
      variables: mutation.state.variables as AnnotateSegmentClassInput,
    }),
  });

  const categories = standard.segment_class_categories;
  const ungroupedClasses = standard.ungrouped_segment_classes;
  const pendingByClassId: Record<string, number[][][]> = Object.fromEntries(
    pendingAnnotations
      .filter((item) => item.variables.imageId === imageId)
      .sort((a, b) => a.submittedAt - b.submittedAt)
      .map((item) => [item.variables.segmentClassId, item.variables.points])
  );

  const imageSegmentClasses = image.segment_classes.map((segmentClass) => ({
    ...segmentClass,
    points: pendingByClassId[segmentClass.id] ?? segmentClass.points,
  }));
  const selectedImageSegmentClass =
    imageSegmentClasses.find((item) => item.id === selectedSegmentClassId) ?? null;

  const imageIds = standard.images.map((img) => img.id);
  const currentIndex = imageIds.indexOf(imageId);
  const safeIndex = currentIndex >= 0 ? currentIndex + 1 : 1;

  const prevImage = currentIndex > 0 ? standard.images[currentIndex - 1] : null;
  const nextImage =
    currentIndex >= 0 && currentIndex < standard.images.length - 1
      ? standard.images[currentIndex + 1]
      : null;
  const nextUnannotatedImage =
    currentIndex >= 0
      ? standard.images.slice(currentIndex + 1).find((img) => img.annotation_count === 0)
      : null;

  const imageUrl = `${BASE_URL}/storage/${image.image_path}`;
  const isCurrentAnnotated = imageSegmentClasses.some((segmentClass) => segmentClass.points.length);

  const saveSegmentContours = (segmentClassId: string, nextContours: number[][][]) => {
    annotate.mutate({
      segmentClassId,
      imageId,
      points: nextContours,
    });
  };

  const handleBack = () => navigate(paths.standardDetail(groupId, standardId));

  const handlePrev = () => {
    if (!prevImage) return;
    navigate(paths.standardImage(groupId, standardId, prevImage.id));
  };

  const handleNext = () => {
    if (!nextImage) return;
    navigate(paths.standardImage(groupId, standardId, nextImage.id));
  };

  const handleNextUnannotated = () => {
    if (!nextUnannotatedImage) return;
    navigate(paths.standardImage(groupId, standardId, nextUnannotatedImage.id));
  };

  const handleFinishDrawing = (draftContour: number[][]) => {
    if (!selectedSegmentClassId) return;

    const existingContours = selectedImageSegmentClass?.points ?? [];
    saveSegmentContours(selectedSegmentClassId, [...existingContours, draftContour]);
    setIsDrawMode(false);
  };

  const handleRefine = () => {
    if (!selectedImageSegmentClass?.points.length || selectedContourIndex === null) {
      return;
    }

    const selectedContour = selectedImageSegmentClass.points[selectedContourIndex];

    refine.mutate(
      { imageId, points: selectedContour },
      {
        onSuccess: (data) => {
          const nextContours = selectedImageSegmentClass.points.map((points, index) =>
            index === selectedContourIndex ? data.points : points
          );

          saveSegmentContours(selectedSegmentClassId!, nextContours);
        },
      }
    );
  };

  const handleDeleteContour = (contourIndex: number) => {
    if (!selectedImageSegmentClass || !selectedSegmentClassId) return;

    const nextContours = selectedImageSegmentClass.points.filter(
      (_, index) => index !== contourIndex
    );

    saveSegmentContours(selectedSegmentClassId!, nextContours);
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
            segmentsCount={standard.stats.segment_classes_count}
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
            segments={imageSegmentClasses}
            selectedId={selectedSegmentClassId}
            onSelect={setSelectedSegmentClassId}
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
          categories={categories}
          ungroupedClasses={ungroupedClasses}
          imageSegmentClasses={imageSegmentClasses}
          selectedSegmentClassId={selectedSegmentClassId}
          onSelectSegmentClass={setSelectedSegmentClassId}
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
};
