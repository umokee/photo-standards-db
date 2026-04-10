import QueryState from "@/components/ui/query-state/query-state";
import { StandardsSection } from "@/page-components/standards/components/standards-section";
import { useGroupDetailOutletContext } from "./group-detail";

export function Component() {
  const { group } = useGroupDetailOutletContext();

  return (
    <QueryState
      isEmpty={!group.standards.length}
      emptyTitle="Нет эталонов"
      emptyDescription="Создайте первый эталон для этой группы"
    >
      <StandardsSection groupId={group.id} standards={group.standards} />
    </QueryState>
  );
}
