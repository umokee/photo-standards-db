import { ContentHeader } from "@/components/layouts/content-header/content-header";
import QueryState from "@/components/ui/query-state/query-state";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { DeleteGroup } from "@/page-components/groups/components/delete-group";
import { UpdateGroup } from "@/page-components/groups/components/update-group";
import { CreateStandard } from "@/page-components/standards/components/create-standard";
import { GroupDetail } from "@/types/contracts";
import { formatDate } from "@/utils/formatDate";
import { Outlet, useLoaderData, useOutletContext } from "react-router-dom";

type GroupDetailOutletContext = {
  group: GroupDetail;
};

export const useGroupDetailOutletContext = () => {
  return useOutletContext<GroupDetailOutletContext>();
};

export function Component() {
  const { groupId } = useLoaderData() as { groupId: string };
  const groupQuery = useGetGroup(groupId);

  if (groupQuery.isLoading) {
    return (
      <QueryState size="page" isLoading={groupQuery.isLoading} loadingText="Загрузка группы">
        {null}
      </QueryState>
    );
  }

  if (groupQuery.isError) {
    return (
      <QueryState
        size="page"
        isError={groupQuery.isError}
        errorTitle="Не удалось открыть группу"
        errorDescription="Проверьте подключение или попробуйте перезагрузить страницу"
      >
        {null}
      </QueryState>
    );
  }

  if (!groupQuery.data) {
    return (
      <QueryState size="page" isEmpty emptyTitle="Группа не найдена">
        {null}
      </QueryState>
    );
  }

  const group = groupQuery.data;

  return (
    <>
      <ContentHeader>
        <ContentHeader.Top
          title={group.name}
          subtitles={[
            ...(group.description ? [group.description] : []),
            formatDate(group.created_at),
          ]}
          meta={[
            `${group.stats.standards_count} эталонов`,
            `${group.stats.images_count} изображений`,
            `${group.stats.annotated_count} размечено`,
            `${group.stats.polygons_count} аннотаций`,
          ]}
        >
          <ContentHeader.Actions>
            <CreateStandard groupId={group.id} />
            <UpdateGroup group={group} />
            <DeleteGroup id={group.id} name={group.name} />
          </ContentHeader.Actions>
        </ContentHeader.Top>
      </ContentHeader>

      <Outlet context={{ group } satisfies GroupDetailOutletContext} />
    </>
  );
}
