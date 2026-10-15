from __future__ import annotations

import copy
import sys
from pathlib import Path

import nbformat
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from verify_notebook import compare_notebooks  # noqa: E402


def release_notebook():
    return nbformat.v4.new_notebook(
        cells=[
            nbformat.v4.new_code_cell(
                "print(environment)",
                id="neurostack-04",
                execution_count=1,
                outputs=[
                    nbformat.v4.new_output(
                        "stream",
                        text="python: 3.12.13\nplatform: macOS\ntorch: 2.12.1\n",
                    )
                ],
            ),
            nbformat.v4.new_code_cell(
                "print(metric)",
                id="science",
                execution_count=2,
                outputs=[nbformat.v4.new_output("stream", text="metric: 0.848559\n")],
            ),
        ]
    )


def test_only_recorded_platform_and_execution_timing_can_vary():
    expected = release_notebook()
    actual = copy.deepcopy(expected)
    actual.cells[0].outputs[
        0
    ].text = "python: 3.12.13\nplatform: Linux\ntorch: 2.12.1\n"
    actual.cells[1].metadata["execution"] = {"timestamp": "different"}
    compare_notebooks(expected, actual)


@pytest.mark.parametrize(
    "change", ["metric", "source", "package", "figure", "metadata", "cell-count"]
)
def test_scientific_or_environment_drift_fails_closed(change):
    expected = release_notebook()
    actual = copy.deepcopy(expected)
    if change == "metric":
        actual.cells[1].outputs[0].text = "metric: 0.848560\n"
    elif change == "source":
        actual.cells[1].source = "print(other_metric)"
    elif change == "package":
        actual.cells[0].outputs[0].text = (
            actual.cells[0].outputs[0].text.replace("2.12.1", "2.12.2")
        )
    elif change == "figure":
        actual.cells[1].outputs.append(
            nbformat.v4.new_output(
                "display_data", data={"application/json": {"value": 1}}
            )
        )
    elif change == "metadata":
        actual.metadata["analysis"] = "changed"
    else:
        actual.cells.pop()
    with pytest.raises(RuntimeError):
        compare_notebooks(expected, actual)
