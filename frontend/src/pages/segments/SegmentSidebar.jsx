import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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

  const segmentsOf = (groupId) => segments.filter((s) => s.segment_group_id === groupId);
  const ungrouped = segments.filter((s) => !s.segment_group_id);

  return (
    <div className="segment-sidebar">
      <div className="segment-sidebar__header">
        <span className="segment-sidebar__header-name">Разметка</span>
        <Button variant="secondary" size="small" onClick={() => setShowAddGroup(true)}>
          Добавить группу
        </Button>
      </div>

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
              <span className="segment-sidebar__body-group-count">{group.segment_count}</span>
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

            {addingToGroupId === group.id && (
              <div className="add-segment-form">
                <Input
                  placeholder="Название сегмента"
                  value={segmentLabel}
                  onChange={setSegmentLabel}
                  autoFocus
                />
                <div className="add-segment-form__actions">
                  <Button variant="secondary" size="small" onClick={() => setAddingToGroupId(null)}>
                    Отмена
                  </Button>
                  <Button size="small" onClick={() => handleAddSegment(group.id)}>
                    Добавить
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div className="segments-sidebar__group">
          <div className="segments-sidebar__group-header">
            <span className="segments-sidebar__group-header-name">Без группы</span>
            <span className="segments-sidebar__group-header-count">{ungrouped.length}</span>
          </div>
          {ungrouped.map((segment) => (
            <div
              key={segment.id}
              className={`segments-sidebar__group-item${
                selectedSegmentId === segment.id ? " segments-sidebar__group-item--selected" : ""
              }`}
              onClick={() => onSelectSegment(segment)}
            >
              <span
                className="segments-sidebar__group-item-dot"
                style={{ background: "hsl(0, 0%, 50%)" }}
              />
              <span className="segments-sidebar__group-item-name">{segment.label}</span>
              <button
                className="segments-sidebar__group-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSegment(segment);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

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
              <Button variant="secondary" onClick={() => setShowAddGroup(false)}>
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
