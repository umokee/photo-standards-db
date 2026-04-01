import { ContentHeader } from "@/components/layouts/content-header/content-header";
import { SectionHeader } from "@/components/layouts/section-header/section-header";
import { Sidebar } from "@/components/layouts/sidebar/sidebar";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import useSidebar from "@/hooks/use-sidebar";
import { deafultGroup, useGetGroup } from "@/page-components/groups/api/get-group";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { CreateGroup } from "@/page-components/groups/components/create-group";
import { DeleteGroup } from "@/page-components/groups/components/delete-group";
import { UpdateGroup } from "@/page-components/groups/components/update-group";
import { CreateStandard } from "@/page-components/standards/components/create-standard";
import { StandardItem } from "@/page-components/standards/components/standard-item";
import { formatDate } from "@/utils/formatDate";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function Component() {
  const { groupId = null } = useParams();
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const { close: closeSidebar } = useSidebar();
  const { data: groups = [], isLoading: groupsLoading, isError: groupsError } = useGetGroups();
  const {
    data: group = deafultGroup,
    isLoading: groupLoading,
    isError: groupError,
  } = useGetGroup(groupId);

  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );
  const standards = group.standards;
  const totalImages = standards.reduce((c, s) => c + (s.image_count ?? 0), 0) ?? 0;
  const annotated = standards.reduce((c, s) => c + (s.annotated_count ?? 0), 0) ?? 0;
  const totalPolygons =
    standards.reduce(
      (c, s) => c + (s.segment_groups?.reduce((c2, sg) => c2 + (sg.segment_count ?? 0), 0) ?? 0),
      0
    ) ?? 0;

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
              isLoading={groupsLoading}
              isError={groupsError}
              isEmpty={!filtered.length}
              emptyText="Нет групп"
              loader="skeleton"
            >
              {filtered.map((group) => (
                <Sidebar.Item
                  key={group.id}
                  active={groupId === group.id}
                  onClick={() => {
                    navigate(`/groups/${group.id}`);
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
          <Sidebar.Footer>
            <CreateGroup />
          </Sidebar.Footer>
        </Sidebar>
      </SplitLayout.Sidebar>
      <SplitLayout.Content>
        <SplitLayout.Body>
          <QueryState
            isLoading={groupLoading}
            isError={groupError}
            isEmpty={!group.id}
            emptyText="Выберите группу"
          >
            <ContentHeader>
              <ContentHeader.Top>
                <div>
                  <ContentHeader.Title>{group.name}</ContentHeader.Title>
                  <ContentHeader.Subtitle>
                    {group.description && group.description}
                  </ContentHeader.Subtitle>
                  <ContentHeader.Subtitle>{formatDate(group.created_at)}</ContentHeader.Subtitle>
                </div>
                <ContentHeader.Actions>
                  <CreateStandard groupId={group.id} />
                  <UpdateGroup group={group} />
                  <DeleteGroup id={group.id} name={group.name} />
                </ContentHeader.Actions>
              </ContentHeader.Top>
              <ContentHeader.Meta>
                <ContentHeader.Stat>{standards.length} эталонов</ContentHeader.Stat>
                <ContentHeader.Stat>{totalImages} изображений</ContentHeader.Stat>
                <ContentHeader.Stat>{annotated} размечено</ContentHeader.Stat>
                <ContentHeader.Stat>{totalPolygons} аннотаций</ContentHeader.Stat>
              </ContentHeader.Meta>
            </ContentHeader>
            <div className="section">
              <SectionHeader>
                <SectionHeader.Title>Эталоны</SectionHeader.Title>
                <SectionHeader.Side>
                  <span className="badge badge--ghost">{standards.length}</span>
                </SectionHeader.Side>
              </SectionHeader>
              {standards.map((standard) => (
                <StandardItem key={standard.id} standard={standard} />
              ))}
            </div>
          </QueryState>
        </SplitLayout.Body>
      </SplitLayout.Content>
    </SplitLayout>
  );
}
