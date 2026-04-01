import ImageWithFallback from "@/components/ui/image-with-fallback/image-with-fallback";
import { Standard } from "@/types/api";
import { BASE_URL } from "@/utils/constants";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { DeleteStandard } from "./delete-standard";
import { StandardDetails } from "./standard-details";
import { UpdateStandard } from "./update-standard";
import { UploadImages } from "./upload-images";

interface Props {
  standard: Standard;
}

export const StandardItem = ({ standard }: Props) => {
  const { groupId = null, standardId = null } = useParams();
  const navigate = useNavigate();
  const isExpanded = standardId === standard.id;
  const toggle = () => {
    if (isExpanded) {
      navigate(`/groups/${groupId}`);
    } else {
      navigate(`/groups/${groupId}/standards/${standard.id}`);
    }
  };

  return (
    <>
      <div className={clsx("standard-item", isExpanded && "standard-item--expanded")}>
        <div className="standard-item__header" onClick={toggle}>
          <div className="standard-item__thumb">
            <ImageWithFallback
              src={standard.image_path && `${BASE_URL}/storage/${standard.image_path}`}
              iconSize={20}
            />
          </div>
          <div className="standard-item__header-info">
            <div className="standard-item__header-info-name">
              {standard.name} {standard.angle && <>{standard.angle}</>}
            </div>
            <div className="standard-item__header-info-details">
              {standard.image_count} изображений &middot; {standard.segment_groups?.length ?? 0}{" "}
              классов
            </div>
          </div>
          <div className="standard-item__right" onClick={(e) => e.stopPropagation()}>
            <div className="standard-item__right-actions">
              <UploadImages standardId={standard.id} />
              <UpdateStandard standard={standard} />
              <DeleteStandard id={standard.id} name={standard.name} />
            </div>
            {/* <div className="standard-item__right-bar">
              <span className="standard-item__right-pct">{pct}%</span>
              <div className="standard-item__bar">
                <div className="standard-item__bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div> */}
          </div>
          <ChevronRight className="standard-item__header-icon" size={14} />
        </div>

        {isExpanded && <StandardDetails standard={standard} />}
      </div>
    </>
  );
};
