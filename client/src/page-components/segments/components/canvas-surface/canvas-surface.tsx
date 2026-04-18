import { useCanvas, type DrawMode } from "@/page-components/segments/hooks/use-canvas";
import useImageLayout from "@/page-components/segments/hooks/use-image-layout";
import { SegmentClassWithPoints } from "@/types/contracts";
import { hasPoints, segmentColor } from "@/utils/canvas";
import { Group, Layer, Stage } from "react-konva";
import useImage from "use-image";
import s from "./canvas-surface.module.scss";
import { CanvasImage } from "./primitives/canvas-image";
import { CanvasOverlay } from "./primitives/canvas-overlay";
import { DraftContour } from "./primitives/draft-contour";
import { PolygonContour } from "./primitives/polygon-contour";
import { ScissorsDraft } from "./primitives/scissors-draft";
import { VertexHandle } from "./primitives/vertex-handle";

interface Props {
  imageUrl: string | null;
  segments: SegmentClassWithPoints[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onFinishDrawing: (points: number[][]) => void;
  selectedContourIndex: number | null;
  onSelectContour: (index: number | null) => void;
  drawMode: DrawMode;
  onCancelDraw: () => void;
  onPointsChange: (segmentId: string, points: number[][][]) => void;
}

export default function Canvas({
  imageUrl,
  segments,
  selectedId,
  onSelect,
  onFinishDrawing,
  selectedContourIndex,
  onSelectContour,
  drawMode,
  onCancelDraw,
  onPointsChange,
}: Props) {
  // crossOrigin='anonymous' нужен для того, чтобы getImageData не падал в режиме ножниц
  // (воркеру нужны пиксели). Сервер должен отдавать картинки с Access-Control-Allow-Origin.
  const [image] = useImage(imageUrl, "anonymous");
  const { containerRef, size, imageRect, toImage, toCanvas, clampToImage } = useImageLayout(image);

  const canvas = useCanvas({
    segments,
    selectedId,
    selectedContourIndex,
    drawMode,
    image,
    imageRect,
    toImage,
    toCanvas,
    clampToImage,
    onSelect,
    onSelectContour,
    onFinishDrawing,
    onPointsChange,
    onCancelDraw,
  });

  const isPolygonDraft = canvas.draft.mode.type === "draw-polygon";
  const isScissorsDraft = canvas.draft.mode.type === "draw-scissors";

  return (
    <div className={s.root} ref={containerRef} onContextMenu={canvas.handleContextMenu}>
      <CanvasOverlay
        isDrawing={canvas.isDrawing}
        modeLabel={canvas.modeLabel}
        hintText={canvas.hintText}
      />
      <Stage
        ref={canvas.viewport.stageRef}
        width={size.width}
        height={size.height}
        style={{ cursor: canvas.defaultCursor }}
        onWheel={canvas.viewport.handleWheel}
        onMouseDown={canvas.viewport.handleStageMouseDown}
        onMouseMove={canvas.handleMouseMove}
        onMouseUp={canvas.viewport.handleStageMouseUp}
        onClick={canvas.handleStageClick}
        onMouseLeave={canvas.handleMouseLeave}
      >
        <CanvasImage
          image={image ?? undefined}
          x={imageRect.offsetX}
          y={imageRect.offsetY}
          width={imageRect.width}
          height={imageRect.height}
        />

        <Layer>
          {segments.map((seg) => {
            if (!hasPoints(seg)) return null;
            const isSelected = seg.id === selectedId;
            const { stroke, fill } = segmentColor(canvas.hueOf(seg), isSelected);

            return (
              <Group key={seg.id}>
                {seg.points.map((contour, ci) => {
                  const canvasPts = contour.map(([ix, iy]: number[]) => toCanvas(ix, iy));
                  const isEditableContour =
                    isSelected && selectedContourIndex === ci && !canvas.isDrawing;

                  return (
                    <PolygonContour
                      contourKey={ci}
                      canvasPoints={canvasPts}
                      stroke={stroke}
                      fill={fill}
                      viewportScale={canvas.viewportScale}
                      fillOpacity={
                        canvas.isDrawing
                          ? 0.05
                          : isEditableContour
                            ? 0.22
                            : isSelected
                              ? 0.14
                              : 0.07
                      }
                      strokeOpacity={isEditableContour ? 1 : isSelected ? 0.9 : 0.76}
                      strokeWidth={isEditableContour ? 2.4 : isSelected ? 1.9 : 1.25}
                      isEditable={isEditableContour}
                      isSelected={isEditableContour || isSelected}
                      dragBoundFunc={canvas.getGroupBound(seg, ci)}
                      onDragStart={canvas.handleGroupDragStart}
                      onDragEnd={(e) => canvas.handleGroupDragEnd(seg, ci, e)}
                      onLineClick={(e) => canvas.handleLineClick(seg, ci, e)}
                      fillRef={(node) => {
                        if (node) canvas.contourFillRefs.current[`${seg.id}-${ci}`] = node;
                      }}
                      outlineRef={(node) => {
                        if (node) canvas.contourOutlineRefs.current[`${seg.id}-${ci}`] = node;
                      }}
                      lineRef={(node) => {
                        if (node) canvas.contourLineRefs.current[`${seg.id}-${ci}`] = node;
                      }}
                    >
                      {isEditableContour &&
                        canvasPts.map(([cx, cy], vi) => (
                          <VertexHandle
                            key={vi}
                            x={cx}
                            y={cy}
                            stroke={stroke}
                            viewportScale={canvas.viewportScale}
                            draggable
                            dragBoundFunc={canvas.stageVertexBound}
                            onDragStart={canvas.handleVertexDragStart}
                            onDragMove={(e) => canvas.handleVertexDragMove(seg, ci, vi, e)}
                            onDragEnd={(e) => canvas.handleVertexDragEnd(seg, ci, vi, e)}
                            onDblClick={(e) => canvas.handleVertexDblClick(seg, ci, vi, e)}
                            onMouseEnter={(e) => canvas.setCursor(e, "grab")}
                            onMouseLeave={(e) => canvas.setCursor(e, canvas.defaultCursor)}
                          />
                        ))}
                    </PolygonContour>
                  );
                })}
              </Group>
            );
          })}
        </Layer>

        {isPolygonDraft && (
          <DraftContour
            points={canvas.draftCanvasPoints}
            stroke={canvas.draftStroke}
            ghostPoint={canvas.draft.draftPreviewPoint}
            outlineRef={(node) => {
              canvas.draftOutlineRef.current = node;
            }}
            viewportScale={canvas.viewportScale}
            lineRef={(node) => {
              canvas.draftLineRef.current = node;
            }}
            dragBoundFunc={canvas.stageVertexBound}
            onVertexDragStart={canvas.handleDrawingVertexDragStart}
            onVertexDragMove={canvas.handleDrawingVertexDragMove}
            onVertexDragEnd={canvas.handleDrawingVertexDragEnd}
            onVertexClick={canvas.handleDrawingVertexClick}
            onVertexDblClick={canvas.handleDrawingVertexDblClick}
            onVertexMouseEnter={(e) => canvas.setCursor(e, "grab")}
            onVertexMouseLeave={(e) => canvas.setCursor(e, "crosshair")}
          />
        )}

        {isScissorsDraft && (
          <ScissorsDraft
            seedsCanvas={canvas.scissors.seeds.map(([ix, iy]) => toCanvas(ix, iy))}
            committedCanvasSegments={canvas.scissors.committedSegments.map((seg) =>
              seg.map(([ix, iy]) => toCanvas(ix, iy))
            )}
            livePathCanvas={
              canvas.scissors.livePath
                ? canvas.scissors.livePath.map(([ix, iy]) => toCanvas(ix, iy))
                : null
            }
            stroke={canvas.draftStroke}
            viewportScale={canvas.viewportScale}
            onSeedClick={canvas.handleDrawingVertexClick}
            onSeedDblClick={canvas.handleDrawingVertexDblClick}
            onSeedMouseEnter={(e) => canvas.setCursor(e, "pointer")}
            onSeedMouseLeave={(e) => canvas.setCursor(e, "crosshair")}
          />
        )}
      </Stage>
    </div>
  );
}
