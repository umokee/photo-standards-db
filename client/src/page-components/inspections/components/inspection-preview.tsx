import useImageLayout from "@/page-components/segments/hooks/use-image-layout";
import { InspectionTaskResult } from "@/types/contracts";
import { Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

export function InspectionPreview({
  file,
  onFileChange,
  result,
  taskStatus,
  taskStage,
  taskProgress,
  isLocked,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const [image] = useImage(previewUrl ?? "");
  const { containerRef, size, imageRect, toCanvas } = useImageLayout(image);

  const overlays = useMemo<OverlayItem[]>(() => {
    if (!result) return [];

    return result.details.flatMap((detail, detailIndex) =>
      detail.detections.map((detection, detectionIndex) => ({
        key: `${detail.segment_id}-${detailIndex}-${detectionIndex}`,
        name: detail.name,
        status: detail.status,
        confidence: detection.confidence,
        bbox: detection.bbox,
        polygon: detection.polygon,
      }))
    );
  }, [result]);

  const openPicker = () => {
    if (isLocked) return;
    inputRef.current?.click();
  };

  const handleFile = (nextFile: File | null) => {
    if (isLocked) return;

    if (!nextFile) {
      setError(null);
      onFileChange(null);
      return;
    }

    if (!["image/jpeg", "image/png"].includes(nextFile.type)) {
      setError("Можно загружать только JPG и PNG");
      return;
    }

    if (nextFile.size > 20 * 1024 * 1024) {
      setError("Файл слишком большой");
      return;
    }

    setError(null);
    onFileChange(nextFile);
  };

  if (!previewUrl) {
    return (
      <div style={{ height: "100%" }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: "none" }}
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          onClick={openPicker}
          onDragOver={(event) => {
            if (isLocked) return;
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            if (isLocked) return;
            event.preventDefault();
            setIsDragging(false);
            handleFile(event.dataTransfer.files?.[0] ?? null);
          }}
          style={{
            all: "unset",
            width: "100%",
            height: "100%",
            minHeight: 420,
            display: "grid",
            placeItems: "center",
            cursor: isLocked ? "default" : "pointer",
            background: isDragging ? "#efe6d5" : "#f7f1e5",
            border: "1px dashed #ccbfa8",
          }}
        >
          <div style={{ display: "grid", gap: 12, textAlign: "center", color: "#8a8f7a" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Upload size={32} />
            </div>
            <strong style={{ color: "#545c45" }}>Загрузите изображение для проверки</strong>
            <span>Перетащите файл сюда или нажмите для выбора</span>
            <span>JPG, PNG · максимум 20 МБ</span>
            {error && <span style={{ color: "#d14b4b" }}>{error}</span>}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        height: "100%",
        minHeight: 0,
        background: "#f3eee2",
        overflow: "hidden",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />

      <Stage
        width={size.width}
        height={size.height}
        style={{ width: "100%", height: "100%", cursor: isLocked ? "default" : "pointer" }}
        onClick={openPicker}
      >
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              x={imageRect.offsetX}
              y={imageRect.offsetY}
              width={imageRect.width}
              height={imageRect.height}
            />
          )}
        </Layer>

        <Layer listening={false}>
          {overlays.map((item) => {
            const stroke = strokeByStatus(item.status);
            const fill = fillByStatus(item.status);
            const [labelX, labelY] = toCanvas(item.bbox.x, item.bbox.y);

            return (
              <Group key={item.key}>
                {item.polygon && item.polygon.length > 1 ? (
                  <Line
                    points={item.polygon.flatMap(([x, y]) => {
                      const [cx, cy] = toCanvas(x, y);
                      return [cx, cy];
                    })}
                    closed
                    stroke={stroke}
                    fill={fill}
                    strokeWidth={2}
                  />
                ) : (
                  <Rect
                    x={imageRect.offsetX + item.bbox.x * imageRect.scale}
                    y={imageRect.offsetY + item.bbox.y * imageRect.scale}
                    width={item.bbox.w * imageRect.scale}
                    height={item.bbox.h * imageRect.scale}
                    stroke={stroke}
                    strokeWidth={2}
                    fill={fill}
                    cornerRadius={8}
                  />
                )}

                <Text
                  x={labelX}
                  y={Math.max(8, labelY - 22)}
                  text={`${item.name} ${Math.round(item.confidence * 100)}%`}
                  fontSize={14}
                  fontStyle="bold"
                  fill={stroke}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {!isLocked && (
        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 10,
            background: "rgba(255, 250, 240, 0.92)",
            border: "1px solid #d9d2c3",
            color: "#545c45",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          {taskStatusLabel(taskStatus)}
        </div>
      )}

      {isLocked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(18, 18, 18, 0.18)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              minWidth: 280,
              maxWidth: 360,
              padding: 20,
              borderRadius: 18,
              background: "rgba(255, 250, 240, 0.94)",
              border: "1px solid #d9d2c3",
              textAlign: "center",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 13, color: "#8a8f7a" }}>{taskStatusLabel(taskStatus)}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#2e3427" }}>
              {taskStage ?? "Проверка изображения"}
            </div>
            {taskProgress != null && (
              <div style={{ fontSize: 16, color: "#545c45" }}>{taskProgress}%</div>
            )}
            <div style={{ color: "#8a8f7a", fontSize: 13 }}>
              Во время проверки фото нельзя заменить
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
