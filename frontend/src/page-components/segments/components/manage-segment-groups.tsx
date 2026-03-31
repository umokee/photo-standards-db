import { Modal, useModalClose } from "@/components/ui/modal/modal";
import QueryState from "@/components/ui/query-state/query-state";
import clsx from "clsx";
import { ChevronRight, Hexagon, Plus, X } from "lucide-react";
import Button from "../../../components/ui/button/button";
import { StandardDetail } from "../../../types/api";
import { useManageSegmentGroups } from "../hooks/use-manage-segment-groups";

interface Props {
  standard: StandardDetail;
  compact?: boolean;
}

export const ManageSegmentGroups = ({ standard, compact }: Props) => (
  <Modal>
    <Modal.Trigger>
      <>
        {compact ? (
          <Button variant="ml" size="sm">
            Классы
          </Button>
        ) : (
          <Button variant="ml" size="sm" icon={Hexagon}>
            Классы сегментации
          </Button>
        )}
      </>
    </Modal.Trigger>
    <Modal.Content>
      <ManageSegmentGroupsModal standard={standard} />
    </Modal.Content>
  </Modal>
);

const ManageSegmentGroupsModal = ({ standard }: Props) => {
  const close = useModalClose();
  const {
    groups,
    saving,
    activeColorKey,
    toggleColorPicker,
    addGroup,
    removeGroup,
    toggleGroup,
    updateGroupName,
    updateGroupHue,
    addSegment,
    removeSegment,
    updateSegmentName,
    save,
  } = useManageSegmentGroups(standard);

  const handleSave = async () => {
    const ok = await save();
    if (ok) close();
  };

  return (
    <>
      <Modal.Header>{`Классы сегментации - ${standard.name}`}</Modal.Header>
      <Modal.Body>
        <QueryState isEmpty={!groups.length} emptyText="Нет классов сегментации">
          <div className="sgm__list">
            {groups.map((group) => {
              const color = `hsl(${group.hue}, 65%, 55%)`;

              return (
                <div
                  key={group.key}
                  className={clsx("sgm__group", group.collapsed && "sgm__group--collapsed")}
                  style={{ "--group-hue": group.hue } as React.CSSProperties}
                >
                  <div className="sgm__group-row">
                    <ChevronRight
                      className="sgm__chevron"
                      size={13}
                      onClick={() => toggleGroup(group.key)}
                    />
                    <label
                      className={clsx(
                        "sgm__color",
                        activeColorKey === group.key && "sgm__color--open"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleColorPicker(group.key);
                      }}
                    >
                      <span style={{ background: color }} />
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={group.hue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateGroupHue(group.key, Number(e.target.value))}
                      />
                    </label>
                    <input
                      className="sgm__name-input"
                      value={group.name}
                      placeholder="Название класса"
                      onChange={(e) => updateGroupName(group.key, e.target.value)}
                    />
                    <button
                      type="button"
                      className="sgm__add-seg"
                      title="Добавить сегмент"
                      onClick={() => addSegment(group.key)}
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      type="button"
                      className="sgm__remove"
                      onClick={() => removeGroup(group.key)}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {!group.collapsed &&
                    group.segments.map((seg) => (
                      <div key={seg.key} className="sgm__seg-row">
                        <span className="sgm__seg-dot" style={{ background: color }} />
                        <input
                          className="sgm__name-input"
                          value={seg.name}
                          placeholder="Название сегмента"
                          onChange={(e) => updateSegmentName(group.key, seg.key, e.target.value)}
                        />
                        <button
                          type="button"
                          className="sgm__remove"
                          onClick={() => removeSegment(group.key, seg.key)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </QueryState>

        <Button variant="ghost" size="sm" icon={Plus} onClick={addGroup}>
          Добавить группу классов
        </Button>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={close}>
          Отмена
        </Button>
        <Button disabled={saving} onClick={handleSave}>
          Сохранить
        </Button>
      </Modal.Footer>
    </>
  );
};
