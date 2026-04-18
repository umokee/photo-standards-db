import { Section } from "@/components/layouts/section/section";
import { Badge } from "@/components/ui/badge/badge";
import Button from "@/components/ui/button/button";
import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { InspectionTaskResult } from "@/types/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSaveInspection } from "../../api/save-inspection";
import s from "./inspection-side-panel.module.scss";

const inspectionResultBadgeType = (status: string): "info" | "success" | "warning" | "danger" => {
  switch (status) {
    case "passed":
      return "success";
    case "failed":
      return "danger";
    default:
      return "info";
  }
};

export const InspectionSidePanel = ({
  groupId,
  result,
  selectedSegmentClassIds,
  setSelectedSegmentClassIds,
  isTaskActive,
  savedInspectionId,
  onSaved,
}: {
  groupId: string | null;
  standardId: string | null;
  taskStatus: string | null;
  taskStage: string | null;
  taskError: string | null;
  taskProgress: number | null;
  result: InspectionTaskResult | null;
  selectedSegmentClassIds: string[];
  setSelectedSegmentClassIds: (value: string[]) => void;
  isTaskActive: boolean;
  savedInspectionId: string | null;
  onSaved: (inspectionId: string) => void;
}) => {
  if (!groupId) {
    return (
      <QueryState
        isEmpty
        size="block"
        emptyTitle="Выберите группу"
        emptyDescription="После выбора группы здесь появятся классы проверки"
      />
    );
  }

  return (
    <div className={s.root}>
      {result && (
        <InspectionResultPanel
          result={result}
          savedInspectionId={savedInspectionId}
          onSaved={onSaved}
        />
      )}

      {groupId && !result && (
        <InspectionSetupPanel
          groupId={groupId}
          selectedSegmentClassIds={selectedSegmentClassIds}
          setSelectedSegmentClassIds={setSelectedSegmentClassIds}
          disabled={isTaskActive}
        />
      )}
    </div>
  );
};

const InspectionSetupPanel = ({
  groupId,
  selectedSegmentClassIds,
  setSelectedSegmentClassIds,
  disabled,
}: {
  groupId: string;
  selectedSegmentClassIds: string[];
  setSelectedSegmentClassIds: (value: string[]) => void;
  disabled: boolean;
}) => {
  const { data: group } = useGetGroup(groupId);
  const [initializedGroupId, setInitializedGroupId] = useState<string | null>(null);
  const [openGroupIds, setOpenGroupIds] = useState<string[]>([]);

  const groups = useMemo(() => {
    const categoryGroups = group.segment_class_categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: category.segment_classes,
    }));

    if (group.ungrouped_segment_classes.length > 0) {
      categoryGroups.push({
        id: "ungrouped",
        name: "Без категории",
        items: group.ungrouped_segment_classes,
      });
    }

    return categoryGroups;
  }, [group]);

  const allIds = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => item.id)),
    [groups]
  );

  useEffect(() => {
    if (initializedGroupId === group.id) return;

    setSelectedSegmentClassIds(allIds);
    setOpenGroupIds(groups.map((group) => group.id));
    setInitializedGroupId(group.id);
  }, [allIds, group.id, groups, initializedGroupId, setSelectedSegmentClassIds]);

  const selectedSet = useMemo(() => new Set(selectedSegmentClassIds), [selectedSegmentClassIds]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));

  const handleToggleItem = (itemId: string) => {
    if (disabled) return;

    const next = selectedSegmentClassIds.includes(itemId)
      ? selectedSegmentClassIds.filter((id) => id !== itemId)
      : [...selectedSegmentClassIds, itemId];

    setSelectedSegmentClassIds(next);
  };

  const handleToggleGroup = (group: { items: { id: string }[] }) => {
    if (disabled) return;

    const groupIds = group.items.map((item) => item.id);
    const isGroupFullySelected = groupIds.every((id) => selectedSet.has(id));

    const next = isGroupFullySelected
      ? selectedSegmentClassIds.filter((id) => !groupIds.includes(id))
      : Array.from(new Set([...selectedSegmentClassIds, ...groupIds]));

    setSelectedSegmentClassIds(next);
  };

  const handleToggleAll = () => {
    if (disabled) return;
    setSelectedSegmentClassIds(allSelected ? [] : allIds);
  };

  const handleToggleOpen = (groupId: string) => {
    setOpenGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const getGroupState = (group: { items: { id: string }[] }) => {
    const ids = group.items.map((item) => item.id);
    const selectedCount = ids.filter((id) => selectedSet.has(id)).length;

    return {
      checked: ids.length > 0 && selectedCount === ids.length,
      indeterminate: selectedCount > 0 && selectedCount < ids.length,
      selectedCount,
      totalCount: ids.length,
    };
  };

  return (
    <Section
      title="Классы для проверки"
      side={
        <div className={s.sectionSide}>
          <Badge>{selectedSegmentClassIds.length}</Badge>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || !allIds.length}
            onClick={handleToggleAll}
          >
            {allSelected ? "Снять все" : "Выбрать все"}
          </Button>
        </div>
      }
      bordered
      scrollable
      maxContentHeight={520}
    >
      <QueryState
        isEmpty={!allIds.length}
        emptyTitle="Нет классов"
        emptyDescription="Для выбранной группы не настроены классы сегментации"
      >
        <div className={s.groups}>
          {groups.map((category) => {
            const groupState = getGroupState(category);
            const isOpen = openGroupIds.includes(category.id);
            const checkboxId = `inspection-group-${category.id}`;

            return (
              <div key={category.id} className={s.group}>
                <div className={s.head}>
                  <div className={s.main}>
                    <GroupCheckbox
                      id={checkboxId}
                      checked={groupState.checked}
                      indeterminate={groupState.indeterminate}
                      disabled={disabled}
                      onChange={() => handleToggleGroup(category)}
                    />

                    <label
                      htmlFor={checkboxId}
                      className={s.label}
                      style={{
                        cursor: disabled ? "default" : "pointer",
                        opacity: disabled ? 0.65 : 1,
                      }}
                    >
                      <span className={s.name}>{category.name}</span>
                    </label>
                  </div>

                  <div className={s.meta}>
                    <button
                      type="button"
                      className={s.toggle}
                      onClick={() => handleToggleOpen(category.id)}
                    >
                      {isOpen ? "Скрыть" : "Показать"}
                    </button>

                    <Badge>
                      {groupState.selectedCount}/{groupState.totalCount}
                    </Badge>
                  </div>
                </div>

                {isOpen && (
                  <div className={s.branch}>
                    {category.items.map((item) => (
                      <label
                        key={item.id}
                        className={s.leaf}
                        style={{
                          cursor: disabled ? "default" : "pointer",
                          opacity: disabled ? 0.65 : 1,
                        }}
                      >
                        <input
                          className={s.checkbox}
                          type="checkbox"
                          checked={selectedSet.has(item.id)}
                          disabled={disabled}
                          onChange={() => handleToggleItem(item.id)}
                        />

                        <span
                          className={s.colorDot}
                          style={{
                            background:
                              item.hue == null
                                ? "var(--text-secondary)"
                                : `hsl(${item.hue}, 70%, 50%)`,
                          }}
                        />

                        <span className={s.name}>{item.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </QueryState>
    </Section>
  );
};

const GroupCheckbox = ({
  id,
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  id: string;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: () => void;
}) => {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      id={id}
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
  );
};

const InspectionResultPanel = ({
  result,
  savedInspectionId,
  onSaved,
}: {
  result: InspectionTaskResult;
  savedInspectionId: string | null;
  onSaved: (inspectionId: string) => void;
}) => {
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  const saveMutation = useSaveInspection({
    mutationConfig: {
      onSuccess: (data) => {
        onSaved(data.inspection_id);
      },
    },
  });

  const effectiveInspectionId = savedInspectionId ?? result.inspection_id ?? null;
  const canSave = !effectiveInspectionId && !saveMutation.isPending;

  const handleSave = () => {
    if (!canSave) return;

    saveMutation.mutate({
      task_id: result.task_id,
      serial_number: serialNumber || null,
      notes: notes || null,
    });
  };

  return (
    <>
      <Section
        title="Результат проверки"
        side={
          <Badge type={inspectionResultBadgeType(result.status)}>
            {result.status === "passed" ? "Пройдено" : "Не пройдено"}
          </Badge>
        }
        bordered
      >
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            Совпадений: {result.matched} / {result.total}
          </div>

          {!!result.model_name && (
            <div style={{ color: "var(--text-secondary)" }}>Модель: {result.model_name}</div>
          )}

          {result.missing.length > 0 && (
            <div style={{ color: "var(--text-secondary)" }}>
              Проблемные классы: {result.missing.join(", ")}
            </div>
          )}
        </div>
      </Section>

      <Section title="Сохранение результата" bordered>
        <div style={{ display: "grid", gap: 12 }}>
          {effectiveInspectionId ? (
            <QueryState
              isEmpty
              size="block"
              emptyTitle="Результат уже сохранён"
              emptyDescription={`ID проверки: ${effectiveInspectionId}`}
            />
          ) : (
            <>
              <Input
                label="Серийный номер"
                placeholder="Например, SN-001"
                value={serialNumber}
                onChange={setSerialNumber}
              />
              <Input
                label="Комментарий"
                placeholder="Дополнительные заметки"
                value={notes}
                onChange={setNotes}
              />
              <Button disabled={!canSave} onClick={handleSave}>
                {saveMutation.isPending ? "Сохранение..." : "Сохранить результат"}
              </Button>
            </>
          )}
        </div>
      </Section>
    </>
  );
};
