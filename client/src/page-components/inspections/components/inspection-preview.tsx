import useImageLayout from "@/page-components/segments/hooks/use-image-layout";
import { InspectionTaskResult } from "@/types/contracts";
import { Upload } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import useImage from "use-image";

type Props = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  result: InspectionTaskResult | null;
  taskStatus: string | null;
  taskStage: string | null;
  taskProgress: number | null;
  isLocked: boolean;
};

type OverlayItem = {
  key: string;
  name: string;
  status: string;
  hue: number | null;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  polygon: number[][] | null;
};

const strokeByStatus = (status: string) => {
  switch (status) {
    case "ok":
      return "#3a9b5d";
    case "less":
      return "#e0a100";
    case "more":
      return "#d14b4b";
    case "extra":
      return "#7a5af8";
    default:
      return "#5b7fff";
  }
};

const fillByStatus = (status: string) => {
  switch (status) {
    case "ok":
      return "rgba(58, 155, 93, 0.12)";
    case "less":
      return "rgba(224, 161, 0, 0.12)";
    case "more":
      return "rgba(209, 75, 75, 0.12)";
    case "extra":
      return "rgba(122, 90, 248, 0.12)";
    default:
      return "rgba(91, 127, 255, 0.12)";
  }
};

const taskStatusLabel = (status: string | null) => {
  switch (status) {
    case "pending":
      return "Подготовка";
    case "queued":
      return "В очереди";
    case "running":
      return "Проверяется";
    case "succeeded":
      return "Готово";
    case "failed":
      return "Ошибка";
    default:
      return "Изображение можно заменить";
  }
};

const detailStatusLabel = (status: string) => {
  switch (status) {
    case "ok":
      return "Совпадает";
    case "less":
      return "Меньше нормы";
    case "more":
      return "Больше нормы";
    case "extra":
      return "Лишний класс";
    default:
      return status;
  }
};

export const InspectionPreview = ({
  file,
  onFileChange,
  result,
  taskStatus,
  taskStage,
  taskProgress,
  isLocked,
}: Props) => {
  const objectUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const [image] = useImage(objectUrl ?? "");
  const { containerRef, size, imageRect } = useImageLayout(image);

  const overlays = useMemo<OverlayItem[]>(() => {
    if (!result) return [];

    return result.details.flatMap((detail) =>
      detail.detections.map((detection, index) => ({
        key: `${detail.class_key}-${index}`,
        name: detail.name,
        status: detail.status,
        hue: detail.hue,
        confidence: detection.confidence,
        bbox: detection.bbox,
        polygon: detection.polygon,
      }))
    );
  }, [result]);

  const handleSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    onFileChange(nextFile);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateRows: "1fr auto",
        gap: 16,
        minHeight: 0,
      }}
    >
      <div
        ref={containerRef}
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--surface-secondary)",
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!file || !image ? (
          <label
            style={{
              width: "100%",
              height: "100%",
              minHeight: 320,
              display: "grid",
              placeItems: "center",
              cursor: isLocked ? "default" : "pointer",
              opacity: isLocked ? 0.7 : 1,
            }}
          >
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={isLocked}
              onChange={handleSelectFile}
            />
            <div
              style={{
                display: "grid",
                justifyItems: "center",
                gap: 10,
                color: "var(--text-secondary)",
              }}
            >
              <Upload size={22} />
              <div>{taskStatusLabel(taskStatus)}</div>
            </div>
          </label>
        ) : (
          <Stage width={size.width} height={size.height}>
            <Layer>
              <KonvaImage
                image={image}
                x={imageRect.offsetX}
                y={imageRect.offsetY}
                width={imageRect.width}
                height={imageRect.height}
              />

              {overlays.map((item) => {
                const hasPolygon = !!item.polygon?.length;

                return (
                  <Group key={item.key}>
                    {hasPolygon ? (
                      <Line
                        points={item.polygon!.flatMap(([x, y]) => [
                          imageRect.offsetX + x * imageRect.scale,
                          imageRect.offsetY + y * imageRect.scale,
                        ])}
                        closed
                        stroke={strokeByStatus(item.status)}
                        fill={fillByStatus(item.status)}
                        strokeWidth={2}
                      />
                    ) : (
                      <Rect
                        x={imageRect.offsetX + item.bbox.x * imageRect.scale}
                        y={imageRect.offsetY + item.bbox.y * imageRect.scale}
                        width={item.bbox.w * imageRect.scale}
                        height={item.bbox.h * imageRect.scale}
                        stroke={strokeByStatus(item.status)}
                        fill={fillByStatus(item.status)}
                        strokeWidth={2}
                      />
                    )}

                    <Text
                      x={imageRect.offsetX + item.bbox.x * imageRect.scale}
                      y={Math.max(imageRect.offsetY + item.bbox.y * imageRect.scale - 20, 0)}
                      text={`${item.name} · ${Math.round(item.confidence * 100)}%`}
                      fontSize={12}
                      padding={4}
                      fill="#fff"
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {taskStage && (
          <div style={{ color: "var(--text-secondary)" }}>
            {taskStage}
            {typeof taskProgress === "number" ? ` · ${taskProgress}%` : ""}
          </div>
        )}

        {!!result && (
          <div
            style={{
              display: "grid",
              gap: 10,
              maxHeight: 260,
              overflow: "auto",
              paddingRight: 4,
            }}
          >
            {result.details.map((detail) => (
              <div
                key={`${detail.class_key}-${detail.name}`}
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                  padding: 12,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background:
                          detail.hue !== null
                            ? `hsl(${detail.hue}, 70%, 50%)`
                            : strokeByStatus(detail.status),
                        flexShrink: 0,
                      }}
                    />
                    <strong>{detail.name}</strong>
                  </div>

                  <span style={{ color: "var(--text-secondary)" }}>
                    {detailStatusLabel(detail.status)}
                  </span>
                </div>

                <div style={{ color: "var(--text-secondary)" }}>
                  Ожидалось: {detail.expected_count} · Найдено: {detail.detected_count} · Δ{" "}
                  {detail.delta > 0 ? `+${detail.delta}` : detail.delta}
                </div>

                {detail.confidence !== null && (
                  <div style={{ color: "var(--text-secondary)" }}>
                    Средняя уверенность: {Math.round(detail.confidence * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
