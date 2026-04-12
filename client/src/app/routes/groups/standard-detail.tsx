import { paths } from "@/app/paths";
import { SectionHeader } from "@/components/layouts/section-header/section-header";
import QueryState from "@/components/ui/query-state/query-state";
import { StandardCard } from "@/page-components/standards/components/standard-card/standard-card";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useGroupDetailOutletContext } from "./group-detail";
import s from "./groups.module.scss";

export function Component() {
  const navigate = useNavigate();
  const { standardId } = useLoaderData() as { standardId: string };
  const { group } = useGroupDetailOutletContext();

  const toggleStandard = (targetStandardId: string) => {
    if (standardId === targetStandardId) {
      navigate(paths.groupDetail(group.id));
      return;
    }

    navigate(paths.standardDetail(group.id, targetStandardId));
  };

  const handleToImageEditor = (imageId: string) => {
    navigate(paths.standardImage(group.id, standardId, imageId));
  };

  return (
    <QueryState
      isEmpty={!group.standards.length}
      emptyTitle="Нет эталонов"
      emptyDescription="Создайте эталоны для этой группы"
    >
      <section className={s.section}>
        <SectionHeader>
          <SectionHeader.Title>Эталоны</SectionHeader.Title>
          <SectionHeader.Side>
            <span className={s.countBadge}>{group.standards.length}</span>
          </SectionHeader.Side>
        </SectionHeader>
        <div className={s.cards}>
          {group.standards.map((standard) => {
            const isExpanded = standardId === standard.id;

            return (
              <StandardCard
                key={standard.id}
                standard={standard}
                expanded={isExpanded}
                onToggle={() => toggleStandard(standard.id)}
                onToImageEditor={(imageId) => handleToImageEditor(imageId)}
              />
            );
          })}
        </div>
      </section>
    </QueryState>
  );
}
