import { ContentHeader } from "@/components/layouts/content-header/content-header";
import { SectionHeader } from "@/components/layouts/section-header/section-header";
import { Sidebar } from "@/components/layouts/sidebar/sidebar";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import useSidebar from "@/hooks/use-sidebar";
import { defaultGroup, useGetGroup } from "@/page-components/groups/api/get-group";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { CreateGroup } from "@/page-components/groups/components/create-group";
import { DeleteGroup } from "@/page-components/groups/components/delete-group";
import { UpdateGroup } from "@/page-components/groups/components/update-group";
import { CreateStandard } from "@/page-components/standards/components/create-standard";
import { StandardCard } from "@/page-components/standards/components/standard-card/standard-card";
import { formatDate } from "@/utils/formatDate";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "../paths";
import s from "./groups.module.scss";

export function Component() {
  const { groupId = null, standardId = null } = useParams();
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const { close: closeSidebar } = useSidebar();
  const { data: groups = [], isLoading: groupsLoading, isError: groupsError } = useGetGroups();
  const {
    data: group = defaultGroup,
    isLoading: groupLoading,
    isError: groupError,
  } = useGetGroup(groupId);

  const filtered = useMemo(
    () => groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search]
  );
  const standards = group.standards;
  const stats = group.stats;

  const toggleStandard = (targetStandardId: string) => {
    if (!groupId) return;

    if (standardId === targetStandardId) {
      navigate(paths.groupDetail(groupId));
      return;
    }

    navigate(paths.standardDetail(groupId, targetStandardId));
  };

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
              emptyTitle="Нет групп"
            >
              {filtered.map((group) => (
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
          <QueryState
            isLoading={groupLoading}
            isError={groupError}
            isEmpty={!group.id}
            emptyTitle="Выберите группу"
          >
            <ContentHeader>
              <ContentHeader.Top
                title={group.name}
                subtitles={[
                  ...(group.description ? [group.description] : []),
                  formatDate(group.created_at),
                ]}
                meta={[
                  `${stats.standards_count} эталонов`,
                  `${stats.images_count} изображений`,
                  `${stats.annotated_count} размечено`,
                  `${stats.polygons_count} аннотаций`,
                ]}
              >
                <ContentHeader.Actions>
                  <CreateStandard groupId={group.id} />
                  <UpdateGroup group={group} />
                  <DeleteGroup id={group.id} name={group.name} />
                </ContentHeader.Actions>
              </ContentHeader.Top>
            </ContentHeader>
            <section className={s.section}>
              <SectionHeader>
                <SectionHeader.Title>Эталоны</SectionHeader.Title>
                <SectionHeader.Side>
                  <span className={s.countBadge}>{standards.length}</span>
                </SectionHeader.Side>
              </SectionHeader>
              <div className={s.cards}>
                {standards.map((standard) => (
                  <StandardCard
                    key={standard.id}
                    standard={standard}
                    expanded={standardId === standard.id}
                    onToggle={() => toggleStandard(standard.id)}
                  />
                ))}
              </div>
            </section>
          </QueryState>
        </SplitLayout.Body>
      </SplitLayout.Content>
    </SplitLayout>
  );
}
