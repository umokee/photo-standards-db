import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "../components/Button";
import ImageInput from "../components/ImageInput";
import QueryState from "../components/QueryState";
import Select from "../components/Select";
import useGroups from "../hooks/useGroups";
import useInspections from "../hooks/useInspections";
import useStandards from "../hooks/useStandards";
import { INSPECTION_MODES } from "../utils/constants";

export default function InspectionPage() {
  const [mode, setMode] = useState("photo");
  const [image, setImage] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [standardId, setStandardId] = useState(null);
  const [result, setResult] = useState(null);
  const { groups, selected: group, status: groupsStatus } = useGroups(groupId);
  const { selected: standard, status: standardsStatus } = useStandards(standardId);
  const { run } = useInspections();
  const standardOptions = useMemo(
    () => group?.standards.map((s) => ({ label: s.name, value: s.id })),
    [group]
  );

  return (
    <div className="page">
      <div className="inspection-page__modes">
        {INSPECTION_MODES.map((m) => (
          <button
            key={m.value}
            className={`inspection-page__modes-item${mode === m.value ? " inspection-page__modes-item--active" : ""}`}
            onClick={() => setMode(m.value)}
            disabled={m.value === "realtime" || m.value === "snapshot"}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="inspection-page__actions">
        <Select
          placeholder="Выберите группу"
          options={groups.map((g) => ({ label: g.name, value: g.id }))}
          value={groupId}
          onChange={(val) => {
            setGroupId(val);
            setStandardId(null);
            setResult(null);
          }}
          disabled={groupsStatus.groups.isLoading || groupsStatus.groups.isError}
        />
        <Select
          placeholder="Выберите эталон"
          disabled={!groupId}
          options={standardOptions}
          value={standardId}
          onChange={setStandardId}
        />
        <Button
          disabled={!groupId || !standardId || !image}
          onClick={() =>
            run.mutate({ image, standard_id: standardId, mode }, { onSuccess: setResult })
          }
        >
          Проверить
        </Button>
      </div>
      <div className="inspection-page__body">
        {mode === "photo" && (
          <>
            <ImageInput value={image} onChange={setImage} />
            <div className="inspection-page__body-info">
              <div className="inspection-page__body-info-result">
                {result ? (
                  <>
                    <span className={`inspection-page__body-info-result-status--${result.status}`}>
                      Результат:
                    </span>
                    <span>
                      {result.matched} / {result.total}
                    </span>
                  </>
                ) : (
                  <span>Результаты</span>
                )}
              </div>
              <div className="inspection-page__body-info-segments">
                <div className="inspection-page__body-info-segments-title">
                  <span>Сегменты</span>
                  <span>{standard?.segments.length}</span>
                </div>
                <QueryState
                  isLoading={standardsStatus.isLoading}
                  isError={standardsStatus.isError}
                  isEmpty={!standard?.segments?.length}
                  emptyText="Выберите эталон"
                >
                  {(result?.details ?? standard?.segments ?? []).map((s) => (
                    <div
                      key={s.segment_id ?? s.id}
                      className="inspection-page__body-info-segments-item"
                    >
                      <span>{s.label}</span>
                      {s.confidence && <span>{(s.confidence * 100).toFixed(2)}%</span>}
                      {s.found !== null && (
                        <span>{s.found ? <Check size={16} /> : <X size={16} />}</span>
                      )}
                    </div>
                  ))}
                </QueryState>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
