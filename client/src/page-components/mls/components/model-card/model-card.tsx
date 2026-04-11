import { ACTIVE_TRAINING_STATUSES } from "@/constants";
import { MlModel, TrainingStatus } from "@/types/contracts";
import { formatDate } from "@/utils/formatDate";
import { ChevronRight } from "lucide-react";

type Props = {
  model: MlModel;
  expanded: boolean;
  onToggle: () => void;
};

const getModelStatus = (model: MlModel): TrainingStatus =>
  model.training_status ?? (model.trained_at ? "done" : "pending");

const getModelProgress = (model: MlModel) => {
  if (model.training_status === "saving") return 100;
  if (model.training_progress === null || !model.epochs) return 0;
  return Math.min(100, Math.round((model.training_progress / model.epochs) * 100));
};

export const ModelCard = ({ model, expanded, onToggle }: Props) => {
  const status = getModelStatus(model);
  const progress = getModelProgress(model);
  const isTraining = ACTIVE_TRAINING_STATUSES.includes(status);
  const isTrained = !!model.trained_at;

  return (
    <article>
      <button type="button" onClick={onToggle}>
        <div>
          <div>
            <strong>{model.name}</strong>
            <ChevronRight />
          </div>

          <div>
            {model.architecture} &middot; v{model.version}
          </div>

          {isTraining ? (
            <>
              <div>{model.training_stage && "В процессе"}</div>
              <div>
                <span>{progress}%</span>
                <div>
                  <div style={{ width: `${progress}%` }} />
                </div>
              </div>
            </>
          ) : isTrained ? (
            <div>
              <span>mAP50: {model.metrics?.mAP50?.toFixed?.(3) ?? "n/a"}</span>
              <span>Precision: {model.metrics?.precision?.toFixed?.(3) ?? "n/a"}</span>
              <span>Обучена: {formatDate(model.trained_at)}</span>
            </div>
          ) : (
            <div>Еще не обучена</div>
          )}
        </div>
        
        {expanded && (
          <div>
            {"оно"}
          </div>
        )}
      </button>
    </article>
  );
};
