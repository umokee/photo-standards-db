import { ContentHeader } from "@/components/layouts/content-header/content-header";
import { ACTIVE_TRAINING_STATUSES } from "@/constants";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { useGetMls } from "@/page-components/mls/api/get-mls";
import { TrainModel } from "@/page-components/mls/components/train-model";
import { GroupListItem, MlModel, TrainingStatus } from "@/types/contracts";
import { formatDate } from "@/utils/formatDate";
import { Outlet, useLoaderData, useOutletContext } from "react-router-dom";

type TrainingModelOutletContext = {
  group: GroupListItem;
  models: MlModel[];
};

export const useTrainingModelOutletContext = () => {
  return useOutletContext<TrainingModelOutletContext>();
};

const getModelStatus = (model: MlModel): TrainingStatus =>
  model.training_status ?? (model.trained_at ? "done" : "pending");

export function Component() {
  const { groupId } = useLoaderData() as { groupId: string };
  const { data: group } = useGetGroup(groupId);
  const { data: models } = useGetMls(groupId);

  const hasTrainData =
    group?.stats.standards_count > 0 &&
    group?.stats.images_count > 0 &&
    group?.stats.polygons_count > 0 &&
    group?.stats.segment_groups_count > 0;

  const runningTraining = models.find((model) =>
    ACTIVE_TRAINING_STATUSES.includes(getModelStatus(model))
  );

  const pendingTraining = models.find((model) => model.training_status === "pending");

  const headerStatus = runningTraining ? (
    <span>Обучение активно</span>
  ) : pendingTraining ? (
    <span>Ожидает запуска</span>
  ) : (
    <span>Нет активного обучения</span>
  );

  return (
    <>
      <ContentHeader>
        <ContentHeader.Top
          title={group.name}
          subtitles={[
            ...(group.description ? [group.description] : []),
            `Создана ${formatDate(group.created_at)}`,
          ]}
          meta={[
            `${group.stats.standards_count} эталонов`,
            `${group.stats.images_count} изображений`,
            `${group.stats.annotated_count} размечено`,
            `${group.stats.polygons_count} аннотаций`,
          ]}
        >
          <ContentHeader.Actions>
            {headerStatus}
            <TrainModel groupId={group.id} hasTrainData={hasTrainData} />
          </ContentHeader.Actions>
        </ContentHeader.Top>
      </ContentHeader>

      <Outlet context={{ group, models }} />
    </>
  );
}
