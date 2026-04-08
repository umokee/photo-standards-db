import ImageWithFallback from "@/components/ui/image-with-fallback/image-with-fallback";
import { GroupStandard } from "@/types/contracts";
import { BASE_URL } from "@/utils/constants";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { ReactNode, Suspense, lazy } from "react";
import { DeleteStandard } from "../delete-standard";
import { UpdateStandard } from "../update-standard";
import { UploadImages } from "../upload-images";
import s from "./standard-card.module.scss";

const StandardCardDetails = lazy(async () => {
  const module = await import("./standard-card-details");
  return { default: module.StandardCardDetails };
});

const Header = ({
  standard,
  expanded,
  onToggle,
  actions,
}: {
  standard: GroupStandard;
  expanded: boolean;
  onToggle: () => void;
  actions?: ReactNode;
}) => {
  const src = standard.reference_path
    ? `${BASE_URL}/storage/${standard.reference_path}`
    : undefined;

  return (
    <div
      className={s.header}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      <div className={s.reference}>
        <ImageWithFallback src={src} iconSize={20} />
      </div>
      <div className={s.info}>
        <div className={s.name}>
          {standard.name} {standard.angle}
        </div>
        <div className={s.meta}>
          {standard.images_count} изображений · {standard.annotated_images_count} размечено
        </div>
      </div>
      {actions && (
        <div className={s.actions} onClick={(event) => event.stopPropagation()}>
          {actions}
        </div>
      )}
      <ChevronRight className={s.chevron} size={14} />
    </div>
  );
};

const DetailsFallback = () => <div className={s.bodyPlaceholder} aria-hidden="true" />;

export const StandardCard = ({
  standard,
  expanded,
  onToggle,
}: {
  standard: GroupStandard;
  expanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className={clsx(s.root, expanded && s.expanded)}>
      <Header
        standard={standard}
        expanded={expanded}
        onToggle={onToggle}
        actions={
          <>
            <UploadImages standardId={standard.id} />
            <UpdateStandard standard={standard} />
            <DeleteStandard id={standard.id} name={standard.name} />
          </>
        }
      />
      {expanded && (
        <Suspense fallback={<DetailsFallback />}>
          <StandardCardDetails standardId={standard.id} />
        </Suspense>
      )}
    </div>
  );
};

export const StandardItem = StandardCard;
