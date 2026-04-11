import Button from "@/components/ui/button/button";
import Input from "@/components/ui/input/input";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import Select from "@/components/ui/select/select";
import { ARCHITECTURE_OPTIONS, IMAGE_SIZE_OPTIONS, TRAINING_LIMITS } from "@/constants";
import { Architecture } from "@/types/contracts";
import { useEffect, useState } from "react";
import { useTrainModel } from "../api/train-model";

const safeRatioSumMax = Math.min(TRAINING_LIMITS.ratioSumMax, 100);

const limitSplitValue = ({
  value,
  min,
  max,
  otherValue,
}: {
  value: string;
  min: number;
  max: number;
  otherValue: string;
}) => {
  if (value === "") return "";

  const next = Number(value);
  if (Number.isNaN(next)) return "";

  const other = Number(otherValue || 0);
  const safeMax = Math.min(max, 100, safeRatioSumMax - other);

  return String(Math.max(min, Math.min(next, safeMax)));
};

interface Props {
  groupId: string;
  hasTrainData: boolean;
}

export const TrainModelGroup = ({ groupId, hasTrainData }: Props) => (
  <Modal>
    <Modal.Trigger>
      <Button>Запустить обучение</Button>
    </Modal.Trigger>
    <Modal.Content>
      <TrainModelModal groupId={groupId} hasTrainData={hasTrainData} />
    </Modal.Content>
  </Modal>
);

const TrainModelModal = ({ groupId, hasTrainData }: Props) => {
  const close = useModalClose();

  const [architecture, setArchitecture] = useState<Architecture>("yolov26n-seg");
  const [epochs, setEpochs] = useState("100");
  const [batchSize, setBatchSize] = useState("16");
  const [imageSize, setImageSize] = useState("640");
  const [trainRatio, setTrainRatio] = useState("80");
  const [valRatio, setValRatio] = useState("10");

  const mutation = useTrainModel({ groupId });

  useEffect(() => {
    if (mutation.isSuccess) {
      close();
    }
  }, [mutation.isSuccess]);

  const trainPercent = Number(trainRatio || 0);
  const valPercent = Number(valRatio || 0);
  const testPercent = Math.max(0, 100 - trainPercent - valPercent);

  const isRatioInvalid = trainPercent + valPercent > safeRatioSumMax;
  const isSubmitDisabled = mutation.isPending || !hasTrainData || isRatioInvalid;

  const handleSubmit = () => {
    if (isSubmitDisabled) return;

    mutation.mutate({
      group_id: groupId,
      architecture,
      epochs: Number(epochs),
      batch_size: Number(batchSize),
      imgsz: Number(imageSize),
      train_ratio: Number(trainRatio),
      val_ratio: Number(valRatio),
    });
  };

  const handleTrainRatioChange = (value: string) => {
    setTrainRatio(
      limitSplitValue({
        value,
        min: TRAINING_LIMITS.trainRatio.min,
        max: TRAINING_LIMITS.trainRatio.max,
        otherValue: valRatio,
      })
    );
  };

  const handleValRatioChange = (value: string) => {
    setValRatio(
      limitSplitValue({
        value,
        min: TRAINING_LIMITS.valRatio.min,
        max: TRAINING_LIMITS.valRatio.max,
        otherValue: trainRatio,
      })
    );
  };

  return (
    <>
      <Modal.Header>Запустить обучение</Modal.Header>
      <Modal.Body>
        <Select
          label="Архитектура"
          options={ARCHITECTURE_OPTIONS}
          value={architecture}
          onChange={(val) => setArchitecture(val as Architecture)}
        />

        <Input
          label="Эпохи"
          type="number"
          min={TRAINING_LIMITS.epochs.min}
          max={TRAINING_LIMITS.epochs.max}
          step={1}
          value={epochs}
          onChange={setEpochs}
        />

        <Input
          label="Batch size"
          type="number"
          min={TRAINING_LIMITS.batchSize.min}
          max={TRAINING_LIMITS.batchSize.max}
          step={1}
          value={batchSize}
          onChange={setBatchSize}
        />

        <Select
          label="Размер изображения"
          options={IMAGE_SIZE_OPTIONS}
          value={imageSize}
          onChange={setImageSize}
        />

        <Input
          label="Train %"
          type="number"
          min={TRAINING_LIMITS.trainRatio.min}
          max={TRAINING_LIMITS.trainRatio.max}
          step={1}
          value={trainRatio}
          onChange={handleTrainRatioChange}
        />

        <Input
          label="Val %"
          type="number"
          min={TRAINING_LIMITS.valRatio.min}
          max={TRAINING_LIMITS.valRatio.max}
          step={1}
          value={valRatio}
          onChange={handleValRatioChange}
        />

        {!hasTrainData && <div>Для обучения нужны эталоны, фото, классы и аннотации.</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={close}>
          Отмена
        </Button>
        <Button disabled={isSubmitDisabled} onClick={handleSubmit}>
          Запустить
        </Button>
      </Modal.Footer>
    </>
  );
};
