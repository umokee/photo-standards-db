import { Sidebar } from "@/components/layouts/sidebar/sidebar";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import useSidebar from "@/hooks/use-sidebar";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { CreateGroup } from "@/page-components/groups/components/create-group";
import { Outlet, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { paths } from "../../paths";

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { close: closeSidebar } = useSidebar();

  const groupsQuery = useGetGroups(search);
  const groups = groupsQuery.data ?? [];

  const setSearch = (val: string) => {
    const next = new URLSearchParams(searchParams);
    const trimmed = val.trim();

    if (trimmed) {
      next.set("search", val);
    } else {
      next.delete("search");
    }

    setSearchParams(next, { replace: true });
  };

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
          <Sidebar.List>
            <QueryState
              isLoading={groupsQuery.isLoading}
              isError={groupsQuery.isError}
              isEmpty={!groups.length}
              emptyTitle="Нет групп"
            >
              {groups.map((group) => (
                <Sidebar.Item
                  key={group.id}
                  active={groupId === group.id}
                  onClick={() => {
                    navigate(paths.groupDetail(group.id));
                    closeSidebar();
                  }}
                >
                  <Sidebar.ItemDot />
                  <Sidebar.ItemBody>
                    <Sidebar.ItemName>{group.name}</Sidebar.ItemName>
                  </Sidebar.ItemBody>
                  <Sidebar.ItemSide>{group.stats.standards_count}</Sidebar.ItemSide>
                </Sidebar.Item>
              ))}
            </QueryState>
          </Sidebar.List>

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
