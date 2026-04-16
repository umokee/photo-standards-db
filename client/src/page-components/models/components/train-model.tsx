import { paths } from "@/app/paths";
import Button from "@/components/ui/button/button";
import Input from "@/components/ui/input/input";
import { Modal, useModalClose } from "@/components/ui/modal/modal";
import Select from "@/components/ui/select/select";
import {
  useAppConstants,
  useArchitectureOptions,
  useImageSizeOptions,
  useTrainingLimits,
} from "@/constants";
import { Architecture } from "@/types/contracts";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrainModel } from "../api/train-model";

const limitSplitValue = ({
  value,
  min,
  max,
  otherValue,
  ratioSumMax,
}: {
  value: string;
  min: number;
  max: number;
  otherValue: string;
  ratioSumMax: number;
}) => {
  if (value === "") return "";

  const next = Number(value);
  if (Number.isNaN(next)) return "";

  const other = Number(otherValue || 0);
  const safeMax = Math.min(max, 100, ratioSumMax - other);

  return String(Math.max(min, Math.min(next, safeMax)));
};

interface Props {
  groupId: string;
  canTrain: boolean;
  isTrainingLocked: boolean;
}

export const TrainModel = ({ groupId, canTrain, isTrainingLocked }: Props) => (
  <Modal>
    <Modal.Trigger>
      <Button>Запустить обучение</Button>
    </Modal.Trigger>
    <Modal.Content>
      <TrainModelModal groupId={groupId} canTrain={canTrain} isTrainingLocked={isTrainingLocked} />
    </Modal.Content>
  </Modal>
);

const TrainModelModal = ({ groupId, canTrain, isTrainingLocked }: Props) => {
  const navigate = useNavigate();
  const close = useModalClose();

  const constants = useAppConstants();
  const architectureOptions = useArchitectureOptions();
  const imageSizeOptions = useImageSizeOptions();
  const trainingLimits = useTrainingLimits();
  const safeRatioSumMax = Math.min(trainingLimits.ratio_sum_max, 100);

  const [architecture, setArchitecture] = useState<Architecture>(
    () => constants.training.architectures.default as Architecture
  );
  const [epochs, setEpochs] = useState(() => String(constants.training.epochs.default));
  const [batchSize, setBatchSize] = useState(() => String(constants.training.batch_size.default));
  const [imageSize, setImageSize] = useState(() => String(constants.training.image_size.default));
  const [trainRatio, setTrainRatio] = useState(() =>
    String(constants.training.train_ratio.default)
  );
  const [valRatio, setValRatio] = useState(() => String(constants.training.val_ratio.default));

  const mutation = useTrainModel({
    groupId,
    mutationConfig: {
      onSuccess: (data) => {
        navigate(paths.trainingModel(groupId, data.model_id));
      },
    },
  });

  useEffect(() => {
    if (mutation.isSuccess) {
      close();
    }
  }, [mutation.isSuccess]);

  const trainPercent = Number(trainRatio || 0);
  const valPercent = Number(valRatio || 0);

  const isRatioInvalid = trainPercent + valPercent > safeRatioSumMax;
  const isSubmitDisabled = mutation.isPending || isTrainingLocked || !canTrain || isRatioInvalid;

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
        min: trainingLimits.train_ratio.min,
        max: trainingLimits.train_ratio.max,
        otherValue: valRatio,
        ratioSumMax: safeRatioSumMax,
      })
    );
  };

  const handleValRatioChange = (value: string) => {
    setValRatio(
      limitSplitValue({
        value,
        min: trainingLimits.val_ratio.min,
        max: trainingLimits.val_ratio.max,
        otherValue: trainRatio,
        ratioSumMax: safeRatioSumMax,
      })
    );
  };

  return (
    <>
      <Modal.Header>Запустить обучение</Modal.Header>
      <Modal.Body>
        <Select
          label="Архитектура"
          options={architectureOptions}
          value={architecture}
          onChange={(val) => setArchitecture(val as Architecture)}
        />

        <Input
          label="Эпохи"
          type="number"
          min={trainingLimits.epochs.min}
          max={trainingLimits.epochs.max}
          step={1}
          value={epochs}
          onChange={setEpochs}
        />

        <Input
          label="Batch size"
          type="number"
          min={trainingLimits.batch_size.min}
          max={trainingLimits.batch_size.max}
          step={1}
          value={batchSize}
          onChange={setBatchSize}
        />

        <Select
          label="Размер изображения"
          options={imageSizeOptions}
          value={imageSize}
          onChange={setImageSize}
        />

        <Input
          label="Train %"
          type="number"
          min={trainingLimits.train_ratio.min}
          max={trainingLimits.train_ratio.max}
          step={1}
          value={trainRatio}
          onChange={handleTrainRatioChange}
        />

        <Input
          label="Val %"
          type="number"
          min={trainingLimits.val_ratio.min}
          max={trainingLimits.val_ratio.max}
          step={1}
          value={valRatio}
          onChange={handleValRatioChange}
        />

        {isTrainingLocked && <div>Для этой группы уже запущено обучение.</div>}
        {!isTrainingLocked && !canTrain && (
          <div>Для обучения нужны эталоны, фото, сегменты и аннотации.</div>
        )}
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
