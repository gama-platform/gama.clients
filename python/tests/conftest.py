import sys
from pathlib import Path

# Make gaml_paths importable from all test subdirectories
sys.path.insert(0, str(Path(__file__).parent))
