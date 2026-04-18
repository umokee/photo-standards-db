import { paths } from "@/app/paths";
import Button from "@/components/ui/button/button";
import Select from "@/components/ui/select/select";
import { useInspectionModeOptions } from "@/constants";
import { useGetGroup } from "@/page-components/groups/api/get-group";
import { useGetGroups } from "@/page-components/groups/api/get-groups";
import { useNavigate, useParams } from "react-router-dom";
import s from "./inspection-topbar.module.scss";
import clsx from "clsx";

const ENABLED_INSPECTION_MODES = new Set(["photo"]);

interface InspectionTopbarProps {
  runDisabled: boolean;
  runLabel: string;
  onRun: () => void;
}

export const InspectionTopbar = ({ onRun, runDisabled, runLabel }: InspectionTopbarProps) => {
  const navigate = useNavigate();
  const { mode, groupId, standardId } = useParams();
  const { data: groups } = useGetGroups();
  const modeOptions = useInspectionModeOptions();

  const currentMode = mode ?? modeOptions[0]?.value ?? "photo";

  const handleModeChange = (nextMode: string) => {
    if (groupId && standardId) {
      navigate(paths.inspectionStandard(nextMode, groupId, standardId));
      return;
    }

    if (groupId) {
      navigate(paths.inspectionGroup(nextMode, groupId));
      return;
    }

    navigate(paths.inspectionMode(nextMode));
  };

  const handleGroupChange = (nextGroupId: string) => {
    if (!nextGroupId) {
      navigate(paths.inspectionMode(currentMode));
      return;
    }

    navigate(paths.inspectionGroup(currentMode, nextGroupId));
  };

  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: group.name,
  }));

  return (
    <div className={s.root}>
      <div className={s.modes}>
        {modeOptions.map((option) => {
          const isActive = option.value === currentMode;
          const isEnabled = ENABLED_INSPECTION_MODES.has(option.value);

          return (
            <button
              key={option.value}
              type="button"
              className={clsx(s.item, isActive && s.active)}
              disabled={!isEnabled}
              onClick={() => {
                if (!isEnabled) return;
                handleModeChange(option.value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <Select
        noMargin
        placeholder="Выберите группу"
        options={groupOptions}
        value={groupId ?? ""}
        onChange={handleGroupChange}
      />

      {groupId ? (
        <InspectionStandardSelect mode={currentMode} groupId={groupId} value={standardId ?? ""} />
      ) : (
        <Select
          noMargin
          disabled
          placeholder="Сначала выберите группу"
          options={[]}
          value=""
          onChange={() => {}}
        />
      )}

      <Button disabled={runDisabled} onClick={onRun}>
        {runLabel}
      </Button>
    </div>
  );
};

const InspectionStandardSelect = ({
  mode,
  groupId,
  value,
}: {
  mode: string;
  groupId: string;
  value: string;
}) => {
  const navigate = useNavigate();
  const { data: group } = useGetGroup(groupId);

  const standardOptions = group.standards.map((standard) => ({
    value: standard.id,
    label: standard.name,
  }));

  const handleStandardChange = (nextStandardId: string) => {
    if (!nextStandardId) {
      navigate(paths.inspectionGroup(mode, groupId));
      return;
    }

    navigate(paths.inspectionStandard(mode, groupId, nextStandardId));
  };

  return (
    <Select
      noMargin
      placeholder="Выберите эталон"
      options={standardOptions}
      value={value}
      onChange={handleStandardChange}
    />
  );
};
