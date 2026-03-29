import QueryState from "@/components/ui/query-state/query-state";
import { CreateStandard } from "@/page-components/standards/components/create-standard";
import { StandardItem } from "@/page-components/standards/components/standard-item";
import { formatDate } from "@/utils/formatDate";
import { CheckCircle, Images, LayoutGrid, Send } from "lucide-react";
import { deafultGroup, useGetGroup } from "../api/get-group";
import { DeleteGroup } from "./delete-group";
import { UpdateGroup } from "./update-group";

interface Props {
  groupId: string;
}

export default function GroupDetails({ groupId }: Props) {
  const { data: group = deafultGroup, isLoading, isError } = useGetGroup(groupId);
  const standards = group.standards;

  const totalImages = standards.reduce((c, s) => c + (s.image_count ?? 0), 0) ?? 0;
  const annotated = standards.reduce((c, s) => c + (s.annotated_count ?? 0), 0) ?? 0;
  const totalPolygons =
    standards.reduce(
      (c, s) => c + (s.segment_groups?.reduce((c2, sg) => c2 + (sg.segment_count ?? 0), 0) ?? 0),
      0
    ) ?? 0;

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      isEmpty={!group.id}
      emptyText="Выберите группу"
    >
      <div className="content-header">
        <div className="content-header__top">
          <div>
            <div className="content-header__title">{group.name}</div>
            {group.description && <div className="content-header__sub">{group.description}</div>}
            {group.created_at && (
              <div className="content-header__sub">{formatDate(group.created_at)}</div>
            )}
          </div>
          <div className="content-header__actions">
            <CreateStandard groupId={group.id} />
            <UpdateGroup group={group} />
            <DeleteGroup id={group.id} name={group.name} />
          </div>
        </div>
        <div className="content-header__meta">
          <div className="content-header__stat">
            <LayoutGrid size={12} strokeWidth={1.5} />
            <span className="content-header__stat-val">{standards.length}</span> эталонов
          </div>
          <div className="content-header__stat">
            <Images size={12} strokeWidth={1.5} />
            <span className="content-header__stat-val">{totalImages}</span> изображений
          </div>
          <div className="content-header__stat">
            <CheckCircle size={12} strokeWidth={1.5} />
            <span className="content-header__stat-val content-header__stat-val--primary">
              {annotated}
            </span>{" "}
            размечено
          </div>
          <div className="content-header__stat">
            <Send size={12} strokeWidth={1.5} />
            <span className="content-header__stat-val content-header__stat-val--ml">
              {totalPolygons}
            </span>{" "}
            аннотаций
          </div>
        </div>
      </div>

      <div className="split__body">
        <div className="section-label">
          Эталоны
          <span className="badge badge--ghost">{standards.length}</span>
        </div>
        {standards.map((standard) => (
          <StandardItem key={standard.id} standard={standard} />
        ))}
      </div>
    </QueryState>
  );
}
