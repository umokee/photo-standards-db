
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import GroupDetails from "@/page-components/groups/components/group-details";
import { GroupSidebar } from "@/page-components/groups/components/group-sidebar";
import { useParams } from "react-router-dom";

export function Component() {
  const { groupId = null } = useParams();

  return (
    <SplitLayout>
      <SplitLayout.Sidebar>
        <GroupSidebar />
      </SplitLayout.Sidebar>
      <SplitLayout.Content>
        <SplitLayout.Body>
          <GroupDetails groupId={groupId} />
        </SplitLayout.Body>
      </SplitLayout.Content>
    </SplitLayout>
  );
}
