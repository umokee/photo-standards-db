import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGroups from "../../hooks/useGroups";
import ClassSelector from "./ClassSelector";
import ModelSidebar from "./ModelSidebar";
import ModelDetails from "./ModelDetails";

export default function ModelsPage() {
  const navigate = useNavigate();
  const { groupId = null } = useParams();
  const { groups, group, status } = useGroups(groupId);

  const [excludedClasses, setExcludedClasses] = useState(new Set());

  const allClasses = useMemo(
    () => [
      ...new Map(
        (group?.standards ?? []).flatMap((s) => s.segment_groups ?? []).map((g) => [g.name, g])
      ).values(),
    ],
    [group]
  );

  const toggleClass = (name) => {
    setExcludedClasses((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  return (
    <div className="split">
      <div className="split__sidebar">
        <ModelSidebar
          groups={groups}
          groupStatus={status}
          selectedGroupId={groupId}
          onSelectGroup={(id) => navigate(`/training/${id}`)}
        />
      </div>
      <div className="split__content">
        <div className="split__body">
          <ModelDetails group={group} />
        </div>
      </div>
      <div className="split__panel">
        <ClassSelector classes={allClasses} excluded={excludedClasses} onToggle={toggleClass} />
      </div>
    </div>
  );
}
