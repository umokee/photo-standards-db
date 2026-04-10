import { paths } from "@/app/paths";
import { SectionHeader } from "@/components/layouts/section-header/section-header";
import { GroupDetail, StandardDetail } from "@/types/contracts";
import { useNavigate } from "react-router-dom";
import s from "./groups.module.scss";
import { StandardCard } from "./standard-card/standard-card";

interface Props {
  groupId: string;
  standards: GroupDetail["standards"];
  standardId?: string;
  standardDetails?: StandardDetail | null;
  standardLoading?: boolean;
  standardError?: boolean;
}

export const StandardsSection = ({
  groupId,
  standards,
  standardId,
  standardDetails,
  standardLoading = false,
  standardError = false,
}: Props) => {
  const navigate = useNavigate();

  const toggleStandard = (targetStandardId: string) => {
    if (standardId === targetStandardId) {
      navigate(paths.groupDetail(groupId));
      return;
    }

    navigate(paths.standardDetail(groupId, targetStandardId));
  };

  const handleToImageEditor = (imageId: string) => {
    navigate(paths.standardImage(groupId, standardId, imageId));
  };

  return (
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

          return (
            <StandardCard
              key={standard.id}
              standard={standard}
              expanded={isExpanded}
              details={isExpanded ? standardDetails : null}
              detailsLoading={isExpanded && standardLoading}
              detailsError={isExpanded && standardError}
              onToggle={() => toggleStandard(standard.id)}
              onToImageEditor={(imageId) => handleToImageEditor(imageId)}
            />
          );
        })}
      </div>
    </section>
  );
};
