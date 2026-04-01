import { Sidebar } from "@/components/layouts/sidebar/sidebar";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import useSidebar from "@/hooks/use-sidebar";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function Component() {
  const { close: closeSidebar } = useSidebar();
  const navigate = useNavigate();
  const { groupId = null } = useParams();
  const [search, setSearch] = useState("");

  const { data: groups = [], isLoading, isError } = useGetGroups();

  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );

  return (
    <SplitLayout>
      <SplitLayout.Sidebar>
        <Sidebar>
          <Sidebar.Header>
            <Sidebar.HeaderTop>
              <Sidebar.Title>Группы</Sidebar.Title>
            </Sidebar.HeaderTop>
            <Input placeholder={"Поиск..."} noMargin value={search} onChange={setSearch} />
          </Sidebar.Header>

          <Sidebar.List>
            <QueryState
              isLoading={isLoading}
              isError={isError}
              isEmpty={!filtered.length}
              emptyText="Нет групп"
              loader="skeleton"
            >
              {filtered.map((group) => (
                <Sidebar.Item
                  key={group.id}
                  active={groupId === group.id}
                  onClick={() => {
                    navigate(`/training/${group.id}`);
                    closeSidebar();
                  }}
                >
                  <Sidebar.ItemDot />
                  <Sidebar.ItemBody>
                    <Sidebar.ItemName>{group.name}</Sidebar.ItemName>
                  </Sidebar.ItemBody>
                  <Sidebar.ItemSide>{group.standards_count ?? 0}</Sidebar.ItemSide>
                </Sidebar.Item>
              ))}
            </QueryState>
          </Sidebar.List>
        </Sidebar>
      </SplitLayout.Sidebar>
      <SplitLayout.Content>
        <SplitLayout.Body>hey</SplitLayout.Body>
      </SplitLayout.Content>
    </SplitLayout>
  );
}
