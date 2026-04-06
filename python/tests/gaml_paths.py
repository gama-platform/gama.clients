"""Shared GAML model paths — all point to the repository-level tests/gaml/ folder."""
from pathlib import Path

# gaml_paths.py lives at python/tests/ → parents[2] is the repo root (gama.clients/)
GAML_DIR = Path(__file__).parents[2] / "tests" / "gaml"

MODEL_EMPTY         = str(GAML_DIR / "empty.gaml")
MODEL_BATCH         = str(GAML_DIR / "empty_batch.gaml")
MODEL_TEST          = str(GAML_DIR / "empty_test.gaml")
MODEL_SIMPLE        = str(GAML_DIR / "simple.gaml")
MODEL_RANDOM        = str(GAML_DIR / "random.gaml")
MODEL_CONSOLE       = str(GAML_DIR / "console_message.gaml")
MODEL_WITH_PARAMS   = str(GAML_DIR / "experiment_with_params.gaml")
MODEL_TO_IMPORT     = str(GAML_DIR / "to_import.gaml")
MODEL_IMPORTING     = str(GAML_DIR / "importing.gaml")
MODEL_FAULTY        = str(GAML_DIR / "faulty.gaml")
MODEL_INIT_ERROR    = str(GAML_DIR / "init_error.gaml")
MODEL_RUNTIME_ERROR = str(GAML_DIR / "runtime_error.gaml")
MODEL_LONG_INIT     = str(GAML_DIR / "long_init.gaml")
MODEL_FILE          = str(GAML_DIR / "file.gaml")
MODEL_COMPLETE      = str(GAML_DIR / "complete.gaml")
