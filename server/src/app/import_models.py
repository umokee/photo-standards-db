from importlib import import_module

MODEL_MODULES = (
    "modules.cameras.models",
    "modules.groups.models",
    "modules.inspections.models",
    "modules.ml_models.models",
    "modules.segments.models",
    "modules.standards.models",
    "modules.tasks.models",
    "modules.users.models",
)


def import_models() -> None:
    for module_path in MODEL_MODULES:
        import_module(module_path)
