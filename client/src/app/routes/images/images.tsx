import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import { QueryBoundary } from "@/components/ui/query-boundary/query-boundary";
import { BASE_URL } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAnnotateSegmentClass } from "@/page-components/segments/api/annotate-segment";
import { useRefineContour } from "@/page-components/segments/api/refine-contour";
import Canvas from "@/page-components/segments/components/canvas-surface/canvas-surface";
import { SegmentHeader } from "@/page-components/segments/components/segment-header/segment-header";
import { SegmentPanel } from "@/page-components/segments/components/segment-panel/segment-panel";
import { useGetImage } from "@/page-components/standards/api/get-image";
import { useGetStandardDetail } from "@/page-components/standards/api/get-standard";
import { SegmentClass, SegmentClassCategory, StandardImageDetail } from "@/types/contracts";
import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { paths } from "../../paths";

type LoaderData = {
  groupId: string;
  standardId: string;
  imageId: string;
};

const buildAllClasses = (
  categories: SegmentClassCategory[],
  ungrouped: SegmentClass[]
): SegmentClass[] => {
  const grouped = categories.flatMap((category) => category.segment_classes);
  return [...grouped, ...ungrouped].sort((a, b) => a.name.localeCompare(b.name));
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

  const categories = standard.segment_class_categories;
  const ungroupedClasses = standard.ungrouped_segment_classes;
  buildAllClasses(categories, ungroupedClasses);

  const imageSegmentClasses = image.segment_classes;
  const selectedImageSegment =
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
  const isCurrentAnnotated = image.annotation_count > 0;


  const handleSaveSegmentContours = (segmentClassId: string, nextContours: number[][][]) => {
    annotate.mutate
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
};
