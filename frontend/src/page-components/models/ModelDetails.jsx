import { useState } from "react";
import Input from "../../components/ui/Input.tsx";
import ProgressBar from "../../components/ui/progress-bar.tsx";
import Select from "../../components/ui/select.tsx";

export default function ModelDetails({ group }) {
  const [epochs, setEpochs] = useState(100);
  const [batchSize, setBatchSize] = useState(16);
  const [resolution, setResolution] = useState(640);

  return (
    <>
      <div className="model-details__info"></div>
      <div className="model-details__standards">
        {group?.standards.map((s) => (
          <div key={s.id} className="model-details__standard">
            <span>{s.name}</span>
            <ProgressBar value={s.annotated_count} max={s.image_count} />
          </div>
        ))}
      </div>
      <div className="model-details__actions">
        <Select label="Модель" />
        <Input label="Эпохи" isNumber value={epochs} onChange={setEpochs} />
        <Input label="Размер батча" isNumber value={batchSize} onChange={setBatchSize} />
        <Input label="Разрешение" isNumber value={resolution} onChange={setResolution} />
      </div>
      <div className="model-details__history"></div>
    </>
  );
}
