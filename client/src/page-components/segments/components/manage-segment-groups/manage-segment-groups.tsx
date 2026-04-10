import Button from "@/components/ui/button/button";
import { ColorPicker } from "@/components/ui/color-picker/color-picker";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import QueryState from "@/components/ui/query-state/query-state";
import { StandardDetail } from "@/types/contracts";
import clsx from "clsx";
import { ChevronRight, Hexagon, Plus, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useManageSegmentGroups } from "../../hooks/use-manage-segment-groups";
import s from "./manage-segment-groups.module.scss";

interface Props {
  standard: StandardDetail;
  compact?: boolean;
}

interface SegmentState {
  key: string;
  name: string;
}

interface GroupState {
  key: string;
  name: string;
  hue: number;
  collapsed: boolean;
  segments: SegmentState[];
}

interface GroupActions {
  toggle: (key: string) => void;
  updateName: (key: string, value: string) => void;
  updateHue: (key: string, value: number) => void;
  remove: (key: string) => void;
}

interface SegmentActions {
  add: (groupKey: string) => void;
  remove: (groupKey: string, segmentKey: string) => void;
  updateName: (groupKey: string, segmentKey: string, value: string) => void;
}

interface SegmentGroupItemProps {
  group: GroupState;
  isColorOpen: boolean;
  activeColorKey: string | null;
  toggleColorPicker: (key: string) => void;
  closeColorPicker: () => void;
  groupActions: GroupActions;
  segmentActions: SegmentActions;
}

const SegmentGroupItem = ({
  group,
  isColorOpen,
  activeColorKey,
  toggleColorPicker,
  closeColorPicker,
  groupActions,
  segmentActions,
}: SegmentGroupItemProps) => {
  const groupColor = `hsl(${group.hue}, 65%, 55%)`;

  const handleRemoveGroup = () => {
    if (activeColorKey === group.key) {
      closeColorPicker();
    }

    groupActions.remove(group.key);
  };

  return (
    <div
      className={clsx(s.group, group.collapsed && s.collapsed)}
      style={{ "--group-hue": group.hue } as CSSProperties}
    >
      <div className={s.groupRow}>
        <ChevronRight
          className={clsx(s.chevron, !group.collapsed && s.expanded)}
          size={13}
          onClick={() => groupActions.toggle(group.key)}
        />
        <div className={s.colorField}>
          <button
            type="button"
            className={clsx(s.colorTrigger, isColorOpen && s.colorOpen)}
            aria-label="Изменить цвет класса"
            onClick={(e) => {
              e.preventDefault();
              toggleColorPicker(group.key);
            }}
          >
            <span className={s.colorSwatch} style={{ background: groupColor }} />
          </button>
        </div>
        <input
          className={s.nameInput}
          value={group.name}
          placeholder="Название класса"
          onChange={(e) => groupActions.updateName(group.key, e.target.value)}
        />
        <button
          type="button"
          className={s.iconButton}
          title="Добавить сегмент"
          onClick={() => segmentActions.add(group.key)}
        >
          <Plus size={12} />
        </button>
        <button
          type="button"
          className={clsx(s.iconButton, s.removeButton)}
          onClick={handleRemoveGroup}
        >
          <X size={14} />
        </button>
      </div>

      {isColorOpen && (
        <div className={s.colorPanel}>
          <ColorPicker
            hue={group.hue}
            onChange={(nextHue) => groupActions.updateHue(group.key, nextHue)}
          />
        </div>
      )}

      {!group.collapsed &&
        group.segments.map((segment) => (
          <div key={segment.key} className={s.segmentRow}>
            <span className={s.segmentDot} style={{ background: groupColor }} />
            <input
              className={s.nameInput}
              value={segment.name}
              placeholder="Название сегмента"
              onChange={(e) => segmentActions.updateName(group.key, segment.key, e.target.value)}
            />
            <button
              type="button"
              className={clsx(s.iconButton, s.removeButton)}
              onClick={() => segmentActions.remove(group.key, segment.key)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
    </div>
  );
};

export const ManageSegmentGroups = ({ standard, compact }: Props) => (
  <Modal>
    <Modal.Trigger>
      <>
        {compact ? (
          <Button variant="ghost" size="sm">
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
    closeColorPicker,
    groupActions,
    segmentActions,
    save,
  } = useManageSegmentGroups(standard);

  const handleSave = async () => {
    const ok = await save();
    if (ok) close();
  };

  return (
    <>
      <Modal.Header>{`Классы эталона ${standard.name}`}</Modal.Header>
      <Modal.Body>
        <div className={s.content}>
          <QueryState isEmpty={!groups.length} emptyTitle="Нет классов сегментации">
            <div className={s.list}>
              {groups.map((group) => (
                <SegmentGroupItem
                  key={group.key}
                  group={group}
                  isColorOpen={activeColorKey === group.key}
                  activeColorKey={activeColorKey}
                  toggleColorPicker={toggleColorPicker}
                  closeColorPicker={closeColorPicker}
                  groupActions={groupActions}
                  segmentActions={segmentActions}
                />
              ))}
            </div>
          </QueryState>

          <Button variant="ghost" size="sm" icon={Plus} onClick={groupActions.add} full>
            Добавить группу классов
          </Button>
        </div>
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
