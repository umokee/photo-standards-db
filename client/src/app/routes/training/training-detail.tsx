import { ContentHeader } from "@/components/layouts/content-header/content-header";
import { Section } from "@/components/layouts/section/section";
import { Badge } from "@/components/ui/badge/badge";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { CoverageItem } from "@/page-components/groups/components/coverage-item/coverage-item";
import { useGetMls } from "@/page-components/mls/api/get-mls";
import { TrainModel } from "@/page-components/mls/components/train-model";
import { GroupDetail, MlModel } from "@/types/contracts";
import { formatDate } from "@/utils/formatDate";
import { Outlet, useLoaderData, useOutletContext } from "react-router-dom";

type TrainingModelOutletContext = {
  group: GroupDetail;
  models: MlModel[];
};

export const useTrainingModelOutletContext = () => {
  return useOutletContext<TrainingModelOutletContext>();
};

export function Component() {
  const { groupId } = useLoaderData() as { groupId: string };
  const { data: group } = useGetGroup(groupId);
  const { data: models } = useGetMls(groupId);

  const hasTrainData =
    group?.stats.standards_count > 0 &&
    group?.stats.images_count > 0 &&
    group?.stats.polygons_count > 0 &&
    group?.stats.segment_groups_count > 0;

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
            <TrainModel groupId={group.id} hasTrainData={hasTrainData} />
          </ContentHeader.Actions>
        </ContentHeader.Top>
      </ContentHeader>
      <Section
        title="Покрытие эталонов"
        side={
          <Badge>
            {group.stats.annotated_count} / {group.stats.images_count}
          </Badge>
        }
        bordered
        scrollable
        maxContentHeight={280}
      >
        {group.standards.map((std) => (
          <CoverageItem key={std.id} standard={std} />
        ))}
      </Section>

      <Outlet context={{ group, models }} />
    </>
  );
}
