import Button from "../../components/Button";
import Modal from "../../components/Modal";

export default function DeleteModal({ entityLabel, name, isPending, onClose, onDelete }) {
  return (
    <Modal
      title={`Удалить ${entityLabel}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={isPending} variant="danger" onClick={onDelete}>
            Удалить
          </Button>
        </>
      }
    >
      <div className="text-off">
        Вы уверены, что хотите удалить <b>{name}</b>?
      </div>
    </Modal>
  );
}
