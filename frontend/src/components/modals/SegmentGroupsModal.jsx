import { ChevronRight, Hexagon, Plus, X } from "lucide-react";
import { useState } from "react";
import useSegmentGroups from "../../hooks/useSegmentGroups";
import useSegments from "../../hooks/useSegments";
import Button from "../Button";
import Modal from "../Modal";

let _key = 0;
const newKey = () => `new-${_key++}`;

export default function SegmentGroupsModal({
  segmentGroups,
  segments,
  standardId,
  standardName,
  onClose,
}) {
  const groupMutations = useSegmentGroups(standardId);
  const segmentMutations = useSegments(null, standardId);
  const [activeColorKey, setActiveColorKey] = useState(null);

  const [groups, setGroups] = useState(() =>
    segmentGroups.map((g) => ({
      _key: g.id,
      id: g.id,
      name: g.name,
      hue: g.hue,
      collapsed: false,
      segments: segments
        .filter((s) => s.segment_group_id === g.id)
        .map((s) => ({ _key: s.id, id: s.id, label: s.label })),
    }))
  );
  const [deletedGroupIds, setDeletedGroupIds] = useState([]);
  const [deletedSegmentIds, setDeletedSegmentIds] = useState([]);

  const addGroup = () =>
    setGroups((prev) => [...prev, { _key: newKey(), id: null, name: "", hue: 210, segments: [] }]);

  const removeGroup = (key, id) => {
    setGroups((prev) => {
      const group = prev.find((g) => g._key === key);
      if (group) {
        const existingSegIds = group.segments.filter((s) => s.id).map((s) => s.id);
        if (existingSegIds.length) setDeletedSegmentIds((p) => [...p, ...existingSegIds]);
      }
      return prev.filter((g) => g._key !== key);
    });
    if (id) setDeletedGroupIds((prev) => [...prev, id]);
  };

  const updateGroup = (key, field, value) =>
    setGroups((prev) => prev.map((g) => (g._key === key ? { ...g, [field]: value } : g)));

  const toggleCollapse = (key) =>
    setGroups((prev) => prev.map((g) => (g._key === key ? { ...g, collapsed: !g.collapsed } : g)));

  const addSegment = (groupKey) =>
    setGroups((prev) =>
      prev.map((g) =>
        g._key === groupKey
          ? { ...g, segments: [...g.segments, { _key: newKey(), id: null, label: "" }] }
          : g
      )
    );

  const removeSegment = (groupKey, segKey, segId) => {
    setGroups((prev) =>
      prev.map((g) =>
        g._key === groupKey ? { ...g, segments: g.segments.filter((s) => s._key !== segKey) } : g
      )
    );
    if (segId) setDeletedSegmentIds((prev) => [...prev, segId]);
  };

  const updateSegment = (groupKey, segKey, value) =>
    setGroups((prev) =>
      prev.map((g) =>
        g._key === groupKey
          ? { ...g, segments: g.segments.map((s) => (s._key === segKey ? { ...s, label: value } : s)) }
          : g
      )
    );

  const isPending =
    groupMutations.create.isPending ||
    groupMutations.update.isPending ||
    groupMutations.remove.isPending ||
    segmentMutations.create.isPending ||
    segmentMutations.update.isPending ||
    segmentMutations.remove.isPending;

  const handleSave = async () => {
    await Promise.all([
      ...deletedGroupIds.map((id) => groupMutations.remove.mutateAsync(id)),
      ...deletedSegmentIds.map((id) => segmentMutations.remove.mutateAsync(id)),
    ]);

    for (const group of groups) {
      let groupId = group.id;

      if (!groupId) {
        if (!group.name.trim()) continue;
        const created = await groupMutations.create.mutateAsync({
          standardId,
          name: group.name.trim(),
          hue: group.hue,
        });
        groupId = created.id;
      } else {
        await groupMutations.update.mutateAsync({ id: groupId, name: group.name, hue: group.hue });
      }

      await Promise.all(
        group.segments.map((seg) => {
          if (!seg.id) {
            if (!seg.label.trim()) return Promise.resolve();
            return segmentMutations.create.mutateAsync({
              standardId,
              segmentGroupId: groupId,
              label: seg.label.trim(),
            });
          }
          return segmentMutations.update.mutateAsync({ id: seg.id, label: seg.label });
        })
      );
    }

    onClose();
  };

  return (
    <Modal
      title={`Классы сегментации — ${standardName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Закрыть</Button>
          <Button variant="primary" disabled={isPending} onClick={handleSave}>Сохранить</Button>
        </>
      }
    >
      {groups.length === 0 ? (
        <div className="sgm__empty">
          <Hexagon size={20} />
          Нет классов сегментации
        </div>
      ) : (
        <div className="sgm__list">
          {groups.map((group) => (
            <div
              key={group._key}
              className={`sgm__group${group.collapsed ? " sgm__group--collapsed" : ""}`}
              style={{ "--group-hue": group.hue }}
            >
              <div className="sgm__group-row">
                <ChevronRight
                  className="sgm__chevron"
                  size={13}
                  onClick={() => toggleCollapse(group._key)}
                />
                <label
                  className={`sgm__color${activeColorKey === group._key ? " sgm__color--open" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveColorKey(activeColorKey === group._key ? null : group._key);
                  }}
                >
                  <span style={{ background: `hsl(${group.hue}, 65%, 55%)` }} />
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={group.hue}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateGroup(group._key, "hue", Number(e.target.value))}
                  />
                </label>
                <input
                  className="sgm__name-input"
                  value={group.name}
                  placeholder="Название класса"
                  onChange={(e) => updateGroup(group._key, "name", e.target.value)}
                />
                <button
                  type="button"
                  className="sgm__add-seg"
                  onClick={() => addSegment(group._key)}
                  title="Добавить сегмент"
                >
                  <Plus size={12} />
                </button>
                <button
                  type="button"
                  className="sgm__remove"
                  onClick={() => removeGroup(group._key, group.id)}
                >
                  <X size={14} />
                </button>
              </div>

              {!group.collapsed &&
                group.segments.map((seg) => (
                  <div key={seg._key} className="sgm__seg-row">
                    <span
                      className="sgm__seg-dot"
                      style={{ background: `hsl(${group.hue}, 65%, 55%)` }}
                    />
                    <input
                      className="sgm__name-input"
                      value={seg.label}
                      placeholder="Название сегмента"
                      onChange={(e) => updateSegment(group._key, seg._key, e.target.value)}
                    />
                    <button
                      type="button"
                      className="sgm__remove"
                      onClick={() => removeSegment(group._key, seg._key, seg.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" icon={Plus} onClick={addGroup}>
        Добавить класс
      </Button>
    </Modal>
  );
}
