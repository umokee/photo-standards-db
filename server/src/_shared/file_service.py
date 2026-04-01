from pathlib import Path

from config import STORAGE_PATH
from exception import ValidationError
from fastapi import UploadFile

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg"}
MAX_SIZE = 20 * 1024 * 1024


async def save_upload(
    upload: UploadFile,
    folder: str,
    filename: str,
) -> str:
    contents = await upload.read()

    if upload.content_type not in ALLOWED_TYPES:
        raise ValidationError("Только JPG и PNG файлы")
    if len(contents) > MAX_SIZE:
        raise ValidationError("Файл слишком большой. Максимум 20 Мб")

    suffix = Path(upload.filename).suffix if upload.filename else ".jpg"
    dir_path = STORAGE_PATH / folder
    dir_path.mkdir(parents=True, exist_ok=True)

    file_path = dir_path / f"{filename}{suffix}"
    file_path.write_bytes(contents)

    return f"{folder}/{filename}{suffix}"


async def delete_file(relative_path: str) -> None:
    file_path = STORAGE_PATH / relative_path
    if file_path.exists():
        file_path.unlink()
