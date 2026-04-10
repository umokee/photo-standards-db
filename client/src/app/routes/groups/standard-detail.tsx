import QueryState from "@/components/ui/query-state/query-state";
import { useGetStandardDetail } from "@/page-components/standards/api/get-standard";
import { StandardsSection } from "@/page-components/standards/components/standards-section";
import { useLoaderData } from "react-router-dom";
import { useGroupDetailOutletContext } from "./group-detail";

export function Component() {
  const { standardId } = useLoaderData() as { standardId: string };
  const { group } = useGroupDetailOutletContext();
  const standardQuery = useGetStandardDetail(standardId);

  return (
    <QueryState
      isEmpty={!group.standards.length}
      emptyTitle="Нет эталонов"
      emptyDescription="Создайте первый эталон для этой группы"
    >
      <StandardsSection
        groupId={group.id}
        standards={group.standards}
        standardId={standardId}
        standardDetails={standardQuery.data ?? null}
        standardLoading={standardQuery.isLoading}
        standardError={standardQuery.isError}
      />
    </QueryState>
  );
}
