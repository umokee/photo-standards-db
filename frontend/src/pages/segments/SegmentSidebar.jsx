import { ChevronRight, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import RangeInput from "../../components/RangeInput";

export default function SegmentSidebar({
  segmentGroups,
  segments,
  selectedSegmentId,
  onSelectSegment,
  onAddGroup,
  onAddSegment,
  onDeleteSegment,
}) {
  const [expanded, setExpanded] = useState(new Set());
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupHue, setGroupHue] = useState(210);

  const [addingToGroupId, setAddingToGroupId] = useState(null);
  const [segmentLabel, setSegmentLabel] = useState("");

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddGroup = () => {
    onAddGroup({ name: groupName, hue: groupHue });
    setGroupName("");
    setGroupHue(210);
    setShowAddGroup(false);
  };

  const handleAddSegment = () => {
    if (!segmentLabel.trim()) return;
    onAddSegment({ label: segmentLabel, segmentGroupId: addingToGroupId });
    setSegmentLabel("");
    setAddingToGroupId(null);
  };

  const segmentsByGroup = useMemo(() => {
    const map = {};
    for (const s of segments) {
      (map[s.segment_group_id] ??= []).push(s);
    }
    return map;
  }, [segments]);

  const segmentsOf = (groupId) => segmentsByGroup[groupId] ?? [];

  return (
    <div className="segment-sidebar">
      <div className="segment-sidebar__header">
        <span className="segment-sidebar__header-name">Разметка</span>
        <Button variant="ghost" size="sm" onClick={() => setShowAddGroup(true)}>
          Добавить группу
        </Button>
      </div>

      <div className="segment-sidebar__list">
        {segmentGroups.map((group) => {
          const isExp = expanded.has(group.id);
          const groupSegments = segmentsOf(group.id);

          return (
            <div key={group.id} className="segment-sidebar__body">
              <div
                className="segment-sidebar__body-group"
                style={{ borderLeft: `3px solid hsl(${group.hue}, 70%, 50%)` }}
              >
                <button
                  className={`segment-sidebar__body-group-dot`}
                  onClick={() => toggle(group.id)}
                >
                  <ChevronRight
                    size={16}
                    style={{
                      transform: isExp ? "rotate(90deg)" : "none",
                    }}
                  />
                </button>
                <span
                  className="segment-sidebar__body-group-color"
                  style={{ background: `hsl(${group.hue}, 70%, 50%)` }}
                />
                <span className="segment-sidebar__body-group-name">{group.name}</span>
                <span className="segment-sidebar__body-group-count">{groupSegments.length}</span>
                <button
                  className="segment-sidebar__body-group-add"
                  onClick={() => {
                    setAddingToGroupId(group.id);
                    setSegmentLabel("");
                    if (!isExp) toggle(group.id);
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {isExp && (
                <>
                  {addingToGroupId === group.id && (
                    <div className="add-segment-form">
                      <Input
                        placeholder="Название сегмента"
                        value={segmentLabel}
                        onChange={setSegmentLabel}
                        autoFocus
                      />
                      <div className="add-segment-form__actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddingToGroupId(null)}
                        >
                          Отмена
                        </Button>
                        <Button size="sm" onClick={() => handleAddSegment(group.id)}>
                          Добавить
                        </Button>
                      </div>
                    </div>
                  )}

                  {groupSegments.map((segment) => (
                    <div
                      key={segment.id}
                      className={`segment-sidebar__body-segment${
                        selectedSegmentId === segment.id
                          ? " segment-sidebar__body-segment--selected"
                          : ""
                      }`}
                      onClick={() => onSelectSegment(segment)}
                    >
                      <span className="segment-sidebar__body-segment-alert">
                        <TriangleAlert
                          size={16}
                          style={{ visibility: segment.points.length === 0 ? "visible" : "hidden" }}
                        />
                      </span>
                      <span
                        className="segment-sidebar__body-segment-color"
                        style={{ background: `hsl(${group.hue}, 70%, 50%)` }}
                      />
                      <span className="segment-sidebar__body-segment-label">{segment.label}</span>
                      <button
                        className="segment-sidebar__body-segment-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSegment(segment);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="segment-sidebar__footer">
        {showAddGroup && (
          <>
            <Input label="Название группы" value={groupName} onChange={setGroupName} />
            <div className="segment-sidebar__footer-color">
              <div
                className="segment-sidebar__footer-color-preview"
                style={{ background: `hsl(${groupHue}, 70%, 50%)` }}
              />
              <RangeInput min={0} max={360} step={10} value={groupHue} onChange={setGroupHue} />
              <span className="segment-sidebar__footer-color-value">{groupHue}</span>
            </div>
            <div className="segment-sidebar__footer-actions">
              <Button variant="ghost" onClick={() => setShowAddGroup(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddGroup}>Добавить</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
