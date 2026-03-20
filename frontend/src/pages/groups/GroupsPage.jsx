import { useNavigate, useParams } from "react-router-dom";
import DeleteModal from "../../components/DeleteModal";
import StandardCreateModal from "../../components/modals/StandardCreateModal";
import StandardUpdateModal from "../../components/modals/StandardUpdateModal";
import QueryState from "../../components/QueryState";
import useGroups from "../../hooks/useGroups";
import useModal from "../../hooks/useModal";
import useStandardImages from "../../hooks/useStandardImages";
import useStandards from "../../hooks/useStandards";
import GroupDetails from "./GroupDetails";
import GroupFormModal from "./GroupFormModal";
import GroupSidebar from "./GroupSidebar";
import ImageUploadModal from "./ImageUploadModal";

export default function GroupsPage() {
  const navigate = useNavigate();
  const { groupId = null } = useParams();
  const { modal, open, close } = useModal();
  const { groups, group, status, create, update, remove } = useGroups(groupId);
  const standards = useStandards();
  const { upload, uploadBatch } = useStandardImages();

  return (
    <div className="page-split">
      <div className="page-split__sidebar">
        <GroupSidebar
          groups={groups}
          selectedId={groupId}
          status={status}
          onAdd={() => open("group-create")}
        />
      </div>
      <div className="page-split__content">
        <QueryState
          isLoading={status.group.isLoading}
          isError={status.group.isError}
          isEmpty={!group}
          emptyText="Выберите группу"
        >
          <GroupDetails
            group={group}
            onEdit={() => open("group-update")}
            onDelete={() => open("group-delete")}
            onAddStandard={() => open("standard-create")}
            onUploadImage={(standard) => open("image-upload", standard)}
          />
        </QueryState>
      </div>

      {modal?.type === "group-create" && (
        <GroupFormModal
          isPending={create.isPending}
          onClose={close}
          onSubmit={({ name, description }) =>
            create.mutate(
              { name, description },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Создать группу`}
          submitText="Создать"
        />
      )}

      {modal?.type === "group-update" && (
        <GroupFormModal
          isPending={update.isPending}
          onClose={close}
          onSubmit={({ name, description }) =>
            update.mutate(
              { id: groupId, name, description },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Изменить группу ${group.name}`}
          submitText="Сохранить"
          initialName={group.name}
          initialDescription={group.description}
        />
      )}

      {modal?.type === "group-delete" && (
        <DeleteModal
          entityLabel="группу"
          name={group.name}
          isPending={remove.isPending}
          onClose={close}
          onDelete={() =>
            remove.mutate(groupId, {
              onSuccess: () => {
                navigate("/groups");
                close();
              },
            })
          }
        />
      )}

      {modal?.type === "standard-create" && (
        <StandardCreateModal
          isPending={standards.create.isPending}
          onClose={close}
          onSubmit={({ name, angle }) =>
            standards.create.mutate(
              { groupId, name, angle },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Добавить эталон`}
          submitText="Добавить"
        />
      )}

      {modal?.type === "standard-update" && (
        <StandardUpdateModal
          isPending={standards.update.isPending}
          onClose={close}
          onSubmit={({ name, angle }) =>
            standards.update.mutate(
              { id: modal.data.id, name, angle },
              {
                onSuccess: () => close(),
              }
            )
          }
          title={`Изменить эталон ${modal.data.name}`}
          submitText="Сохранить"
          initialName={modal.data.name}
          initialAngle={modal.data.angle}
        />
      )}

      {modal?.type === "standard-delete" && (
        <DeleteModal
          entityLabel="эталон"
          name={modal.data.name}
          isPending={standards.remove.isPending}
          onClose={close}
          onDelete={() =>
            standards.remove.mutate(modal.data.id, {
              onSuccess: () => {
                close();
              },
            })
          }
        />
      )}

      {modal?.type === "image-upload" && (
        <ImageUploadModal
          isPending={upload.isPending}
          onClose={close}
          onUpload={(images) =>
            uploadBatch.mutate({ standardId: modal.data.id, images }, { onSuccess: () => close() })
          }
        />
      )}
    </div>
  );
}
