import { Sidebar } from "@/components/layouts/sidebar/sidebar";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import Input from "@/components/ui/input/input";
import { QueryBoundary } from "@/components/ui/query-boundary/query-boundary";
import { useSearch } from "@/hooks/use-search";
import useSidebar from "@/hooks/use-sidebar";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { CreateGroup } from "@/page-components/groups/components/create-group";
import { GroupListItem } from "@/types/contracts";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { paths } from "../../paths";

export function Component() {
  const { groupId } = useParams();
  const { data } = useGetGroups();
  const {
    search,
    setSearch,
    filtered: groups,
  } = useSearch({ items: data, getText: (g) => g.name });

  return (
    <SplitLayout>
      <SplitLayout.Sidebar>
        <Sidebar>
          <Sidebar.Header>
            <Sidebar.HeaderTop>
              <Sidebar.Title>Группы</Sidebar.Title>
            </Sidebar.HeaderTop>
            <Input placeholder="Поиск..." noMargin value={search} onChange={setSearch} />
          </Sidebar.Header>

          <QueryBoundary
            size="block"
            loadingText="Загрузка групп..."
            errorTitle="Не удалось загрузить группы"
          >
            <GroupsList groupId={groupId} groups={groups} />
          </QueryBoundary>

          <Sidebar.Footer>
            <CreateGroup />
          </Sidebar.Footer>
        </Sidebar>
      </SplitLayout.Sidebar>

      <SplitLayout.Content>
        <SplitLayout.Body>
          <Outlet />
        </SplitLayout.Body>
      </SplitLayout.Content>
    </SplitLayout>
  );
}

const GroupsList = ({ groupId, groups }: { groupId: string | null; groups: GroupListItem[] }) => {
  const navigate = useNavigate();
  const { close: closeSidebar } = useSidebar();

  const handleToGroup = (id: string) => {
    navigate(paths.groupDetail(id));
    closeSidebar();
  };

  return (
    <Sidebar.List>
      {groups.map((group) => (
        <Sidebar.Item
          key={group.id}
          active={groupId === group.id}
          onClick={() => handleToGroup(group.id)}
        >
          <Sidebar.ItemDot />
          <Sidebar.ItemBody>
            <Sidebar.ItemName>{group.name}</Sidebar.ItemName>
          </Sidebar.ItemBody>
          <Sidebar.ItemSide>{group.stats.standards_count}</Sidebar.ItemSide>
        </Sidebar.Item>
      ))}
    </Sidebar.List>
  );
};
