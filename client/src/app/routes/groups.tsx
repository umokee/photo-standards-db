import { ContentHeader } from "@/components/layouts/content-header/content-header";
import { SectionHeader } from "@/components/layouts/section-header/section-header";
import { Sidebar } from "@/components/layouts/sidebar/sidebar";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import useSidebar from "@/hooks/use-sidebar";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { CreateGroup } from "@/page-components/groups/components/create-group";
import { DeleteGroup } from "@/page-components/groups/components/delete-group";
import { UpdateGroup } from "@/page-components/groups/components/update-group";
import { useGetStandardDetail } from "@/page-components/standards/api/get-standard";
import { CreateStandard } from "@/page-components/standards/components/create-standard";
import { StandardCard } from "@/page-components/standards/components/standard-card/standard-card";
import { formatDate } from "@/utils/formatDate";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { paths } from "../paths";
import s from "./groups.module.scss";

const useGroupSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";

  const setSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    const trimmed = value.trim();

    if (trimmed) {
      next.set("search", value);
    } else {
      next.delete("search");
    }

    setSearchParams(next, { replace: true });
  };

  return { search, setSearch };
};

export function Component() {
  const navigate = useNavigate();
  const { groupId, standardId } = useParams();
  const { close: closeSidebar } = useSidebar();
  const { search, setSearch } = useGroupSearch();

  const groupsQuery = useGetGroups(search);
  const groupQuery = useGetGroup(groupId);
  const standardQuery = useGetStandardDetail(standardId);

  const groups = groupsQuery.data;
  const group = groupQuery.data;
  const standard = standardQuery.data;

  const isLoading = groupsQuery.isPending || groupQuery.isPending || standardQuery.isPending;
  const isError = !!groupsQuery.error || !!groupQuery.error || !!standardQuery.error;
  const isEmpty = !isLoading && !isError && (!groups || !group || !standard);

  if (isLoading || isError || isEmpty) {
    return (
      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={isEmpty}
        size="page"
        loadingText="Загрузка группы"
        errorTitle="Не удалось открыть группы"
        emptyTitle="Группа не найдена"
      >
        {null}
      </QueryState>
    );
  }

  const standards = group.standards;
  const stats = group.stats;
}

const GroupsContent = () => {
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
                {standards.map((standard) => {
                  const isExpanded = standardId === standard.id;
                  const details = isExpanded ? expandedStandard : null;

                  return (
                    <StandardCard
                      key={standard.id}
                      standard={standard}
                      expanded={isExpanded}
                      details={details}
                      detailsLoading={isExpanded && expandedStandardQuery.isPending}
                      detailsError={isExpanded && expandedStandardQuery.isError}
                      onToggle={() => toggleStandard(standard.id)}
                    />
                  );
                })}
              </div>
            </section>
          </QueryState>
        </SplitLayout.Body>
      </SplitLayout.Content>
    </SplitLayout>
  );
};
