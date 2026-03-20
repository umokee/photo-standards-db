import { ChevronRight, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import ImageWithFallback from "../../components/ImageWithFallback";
import QueryState from "../../components/QueryState";
import useStandardDetail from "../../hooks/useStandardDetail";
import useStandardImages from "../../hooks/useStandardImages";
import { BASE_URL } from "../../utils/constants";

export default function StandardItem({ standard, onUpload }) {
  const navigate = useNavigate();
  const [isExpaned, setIsExpaned] = useState(false);
  const { standard: detail, status } = useStandardDetail(standard.id, { enabled: isExpaned });
  const { remove, setReference } = useStandardImages(undefined, standard.id);

  return (
    <div className={`standard-item${isExpaned ? " standard-item--expanded" : ""}`}>
      <div className="standard-item__header" onClick={() => setIsExpaned(!isExpaned)}>
        {/* <ImageWithFallback
          className="standard-item__header-img"
          src={`${BASE_URL}/storage/${standard.image_path}`}
        /> */}
        <div className="standard-item__header-info">
          <span className="standard-item__header-info-name">{standard.name}</span>
          <div className="standard-item__header-info-details">
            <span>{standard.angle}</span>
            <span>{standard.image_count} фото</span>
            <span>
              {standard.annotated_count}/{standard.image_count} размечено
            </span>
          </div>
        </div>
        <ChevronRight className="standard-item__header-icon" size={16} />
      </div>

      {isExpaned && (
        <div className="standard-item__body">
          <div className="standard-item__body-header">
            <span className="standard-item__body-header-name">
              Фотографии &middot; {detail?.images.length ?? standard.image_count}
            </span>
            <Button variant="secondary" size="small" onClick={onUpload}>
              Загрузить
            </Button>
          </div>

          <QueryState
            isLoading={status.isLoading}
            isError={status.isError}
            isEmpty={detail?.images.length === 0}
            emptyText="Нет фотографий"
          >
            {detail && (
              <div className="standard-item__body-images">
                {detail.images.map((image) => (
                  <div
                    key={image.id}
                    className={`standard-item__body-images-img${image.segment_count > 0 ? " standard-item__body-images-img--has-seg" : ""}`}
                    onClick={() => navigate(`/standards/${standard.id}/image/${image.id}`)}
                  >
                    <ImageWithFallback
                      src={`${BASE_URL}/storage/${image.image_path}`}
                      className="standard-item__body-images-img-photo"
                    />
                    {image.segment_count > 0 && (
                      <span className="standard-item__body-images-img-has-seg">
                        {image.segment_count}
                      </span>
                    )}
                    {image.segment_count === 0 && (
                      <span className="standard-item__body-images-img-no-seg">не размечено</span>
                    )}
                    {image.is_reference && (
                      <span className="standard-item__body-images-img-ref">ЭТ</span>
                    )}
                    <div className="standard-item__body-images-img-overlay">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReference.mutate(image.id);
                        }}
                      >
                        <Star size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove.mutate(image.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </QueryState>
        </div>
      )}
    </div>
  );
}
