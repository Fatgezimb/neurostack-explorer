"""Deterministic, leakage-aware model fixtures for the public NWB derivative."""

from __future__ import annotations

import importlib.metadata
import hashlib
import json
import math
import platform
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from .artifacts import model_input_fingerprint, write_json
from .constants import ARTIFACT_SCHEMA_VERSION, PIPELINE_SEED

TRAIN_END = 3_600
VALIDATION_END = 4_200
TEST_START = 4_500
TARGET_UNIT_ID = "t1c1"
DISPLAY_STRIDE = 5
SKLEARN_ALPHA_GRID = (0.0, 0.001, 0.01, 0.1)
PYTORCH_WEIGHT_DECAY = 0.001
POSTERIOR_PREDICTIVE_SEED = PIPELINE_SEED + 101


@dataclass(frozen=True)
class ModelTaskArrays:
    """Aligned arrays with train-only preprocessing and a chronological gap."""

    x_train: np.ndarray
    y_train: np.ndarray
    x_validation: np.ndarray
    y_validation: np.ndarray
    x_test: np.ndarray
    y_test: np.ndarray
    feature_mean: np.ndarray
    feature_scale: np.ndarray
    full_row_count: int
    pynapple_count_verified: bool


def _version(distribution_name: str) -> str:
    return importlib.metadata.version(distribution_name)


def _round(values: np.ndarray, digits: int = 6) -> list[float]:
    return [float(value) for value in np.round(values, digits).tolist()]


def _poisson_deviance(observed: np.ndarray, predicted: np.ndarray) -> float:
    predicted = np.clip(np.asarray(predicted, dtype=float), 1e-9, None)
    observed = np.asarray(observed, dtype=float)
    terms = np.where(
        observed > 0,
        observed * np.log(np.clip(observed, 1e-12, None) / predicted)
        - (observed - predicted),
        predicted,
    )
    return float(2.0 * np.mean(terms))


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_commit(repo_root: Path) -> str | None:
    completed = subprocess.run(
        ["git", "rev-parse", "--verify", "HEAD"],
        cwd=repo_root,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        return None
    commit = completed.stdout.strip()
    return commit if len(commit) == 40 else None


def _standardize_with_training_block(
    training: np.ndarray, evaluation: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Fit a fold-local standardizer without looking at evaluation rows."""

    mean = training.mean(axis=0)
    scale = training.std(axis=0)
    if np.any(scale <= 0):
        raise ValueError("A cross-validation feature is constant in its training fold.")
    return (training - mean) / scale, (evaluation - mean) / scale


def prepare_model_task(artifact: dict[str, Any]) -> ModelTaskArrays:
    """Create one common next-bin-count task from the committed derivative."""

    import pynapple as nap  # type: ignore[import-untyped]

    if artifact["metadata"]["origin"] != "public-derived":
        raise ValueError("Aligned fitted models require the public-derived artifact.")
    timestamps = np.asarray(artifact["position"]["timestamps"], dtype=float)
    x_position = np.asarray(artifact["position"]["x"], dtype=float)
    y_position = np.asarray(artifact["position"]["y"], dtype=float)
    interval = float(artifact["metadata"]["positionSampleIntervalSeconds"])
    trailing_speed = np.zeros_like(x_position)
    trailing_speed[1:] = np.hypot(np.diff(x_position), np.diff(y_position)) / interval
    unit = next(row for row in artifact["units"] if row["id"] == TARGET_UNIT_ID)
    support = nap.IntervalSet(start=0.0, end=600.0, time_units="s")
    spike_series = nap.Ts(
        t=np.asarray(unit["spikeTimes"], dtype=float),
        time_units="s",
        time_support=support,
    )
    pynapple_counts = np.asarray(
        spike_series.count(bin_size=0.1, ep=support, time_units="s"), dtype=float
    )
    serialized_rates = artifact["derived"]["unitRates"]
    if isinstance(serialized_rates, dict):
        serialized_count = (
            np.asarray(serialized_rates[TARGET_UNIT_ID], dtype=float) * 0.1
        )
    else:
        unit_index = artifact["metadata"]["unitIds"].index(TARGET_UNIT_ID)
        serialized_count = np.asarray(serialized_rates[unit_index], dtype=float) * 0.1
    count_verified = bool(np.array_equal(pynapple_counts, serialized_count))
    if not count_verified:
        raise ValueError("Pynapple counts do not match the serialized 100 ms rates.")

    raw_features = np.column_stack(
        [x_position, y_position, trailing_speed, pynapple_counts]
    )
    if raw_features.shape != (6_000, 4):
        raise ValueError(f"Unexpected model feature shape: {raw_features.shape}.")

    # Covariates and selected-unit count from bin i predict count in bin i + 1.
    features = raw_features[:-1]
    target = pynapple_counts[1:]
    if len(features) != 5_999 or len(target) != 5_999:
        raise ValueError("Unexpected next-bin task row count.")
    feature_mean = features[:TRAIN_END].mean(axis=0)
    feature_scale = features[:TRAIN_END].std(axis=0)
    if np.any(feature_scale <= 0):
        raise ValueError("A model feature is constant in the training block.")
    standardized = (features - feature_mean) / feature_scale
    if not np.all(np.isfinite(standardized)):
        raise ValueError("Standardized model features are not finite.")
    if timestamps[TEST_START] - timestamps[VALIDATION_END] < 29.9:
        raise ValueError("The chronological train/test gap is shorter than declared.")

    return ModelTaskArrays(
        x_train=standardized[:TRAIN_END].astype(np.float64),
        y_train=target[:TRAIN_END].astype(np.float64),
        x_validation=standardized[TRAIN_END:VALIDATION_END].astype(np.float64),
        y_validation=target[TRAIN_END:VALIDATION_END].astype(np.float64),
        x_test=standardized[TEST_START:].astype(np.float64),
        y_test=target[TEST_START:].astype(np.float64),
        feature_mean=feature_mean,
        feature_scale=feature_scale,
        full_row_count=len(features),
        pynapple_count_verified=count_verified,
    )


def _base_model_record(
    *,
    label: str,
    observed: np.ndarray,
    predicted: np.ndarray,
    validation_observed: np.ndarray,
    validation_predicted: np.ndarray,
    validation_use: str,
    disclosure: str,
) -> dict[str, Any]:
    metric = _poisson_deviance(observed, predicted)
    displayed_observed = observed[::DISPLAY_STRIDE]
    displayed_predicted = predicted[::DISPLAY_STRIDE]
    return {
        "label": label,
        "observed": _round(displayed_observed, 6),
        "predicted": _round(displayed_predicted, 6),
        "metricLabel": "Mean Poisson deviance",
        "metricValue": round(metric, 6),
        "origin": "public-derived",
        "execution": "precomputed",
        "status": "computed",
        "artifactAvailable": True,
        "displayStride": DISPLAY_STRIDE,
        "heldOutSampleCount": int(len(observed)),
        "validationMetricLabel": "Mean Poisson deviance",
        "validationMetricValue": round(
            _poisson_deviance(validation_observed, validation_predicted), 6
        ),
        "validationSampleCount": int(len(validation_observed)),
        "validationUse": validation_use,
        "disclosure": disclosure,
    }


def fit_sklearn(task: ModelTaskArrays) -> dict[str, Any]:
    from sklearn.linear_model import PoissonRegressor  # type: ignore[import-untyped]

    fold_boundaries = (
        ("expanding-1", 0, 900, 1_800),
        ("expanding-2", 0, 1_800, 2_700),
        ("expanding-3", 0, 2_700, 3_600),
    )
    fold_records: list[dict[str, Any]] = []
    scores_by_alpha: dict[float, list[float]] = {
        alpha: [] for alpha in SKLEARN_ALPHA_GRID
    }
    for fold_id, train_start, train_end, validation_end in fold_boundaries:
        fold_train, fold_validation = _standardize_with_training_block(
            task.x_train[train_start:train_end],
            task.x_train[train_end:validation_end],
        )
        result_rows: list[dict[str, Any]] = []
        for alpha in SKLEARN_ALPHA_GRID:
            fold_estimator = PoissonRegressor(alpha=alpha, max_iter=1_000, tol=1e-9)
            fold_estimator.fit(fold_train, task.y_train[train_start:train_end])
            fold_predicted = np.clip(
                fold_estimator.predict(fold_validation), 1e-9, None
            )
            deviance = _poisson_deviance(
                task.y_train[train_end:validation_end], fold_predicted
            )
            scores_by_alpha[alpha].append(deviance)
            result_rows.append(
                {
                    "alpha": alpha,
                    "meanPoissonDeviance": round(deviance, 8),
                    "iterations": int(fold_estimator.n_iter_),
                }
            )
        fold_records.append(
            {
                "id": fold_id,
                "trainRows": [train_start, train_end],
                "validationRows": [train_end, validation_end],
                "rowConvention": "zero-based half-open intervals",
                "preprocessing": (
                    "Mean and standard deviation fit on this fold's training rows only"
                ),
                "results": result_rows,
            }
        )
    summary: list[dict[str, Any]] = [
        {
            "alpha": alpha,
            "foldDeviances": _round(np.asarray(scores_by_alpha[alpha]), 8),
            "meanPoissonDeviance": round(float(np.mean(scores_by_alpha[alpha])), 8),
        }
        for alpha in SKLEARN_ALPHA_GRID
    ]
    # The rule is declared before the outer validation or final test is evaluated.
    selected_summary = min(
        summary,
        key=lambda row: (row["meanPoissonDeviance"], -float(row["alpha"])),
    )
    selected_alpha = float(selected_summary["alpha"])
    estimator = PoissonRegressor(alpha=selected_alpha, max_iter=1_000, tol=1e-9)
    estimator.fit(task.x_train, task.y_train)
    validation_predicted = np.clip(estimator.predict(task.x_validation), 1e-9, None)
    predicted = np.clip(estimator.predict(task.x_test), 1e-9, None)
    record = _base_model_record(
        label="scikit-learn PoissonRegressor",
        observed=task.y_test,
        predicted=predicted,
        validation_observed=task.y_validation,
        validation_predicted=validation_predicted,
        validation_use=(
            "outer validation reported only; alpha selected by expanding-window "
            "cross-validation contained entirely within the training block"
        ),
        disclosure=(
            "Actually fit with scikit-learn on the common chronological training "
            "block. Coefficients and held-out predictions are precomputed; no "
            "claim of biological generalization is made."
        ),
    )
    record.update(
        {
            "software": {"scikit-learn": _version("scikit-learn")},
            "configuration": {
                "estimator": "PoissonRegressor",
                "alpha": selected_alpha,
                "maxIter": 1_000,
                "tolerance": 1e-9,
            },
            "coefficients": _round(np.asarray(estimator.coef_), 8),
            "intercept": round(float(estimator.intercept_), 8),
            "iterations": int(estimator.n_iter_),
            "crossValidation": {
                "strategy": (
                    "Three expanding-window chronological folds contained within "
                    "outer training rows [0, 3600)"
                ),
                "outerTrainingRows": [0, TRAIN_END],
                "alphaGrid": list(SKLEARN_ALPHA_GRID),
                "selectionMetric": "Mean fold-validation Poisson deviance",
                "selectionRule": (
                    "Select the lowest mean training-only cross-validation deviance; "
                    "an exact tie favors the larger alpha. Outer validation and final "
                    "test results are not inputs to selection."
                ),
                "folds": fold_records,
                "summary": summary,
                "selectedAlpha": selected_alpha,
            },
            "baseline": {
                "label": "Training-mean intercept-only reference",
                "configuration": (
                    "One constant prediction equal to the mean next-bin count in "
                    "outer training rows [0, 3600)"
                ),
                "trainingMeanCount": round(float(task.y_train.mean()), 8),
                "validationMetricLabel": "Mean Poisson deviance",
                "validationMetricValue": round(
                    _poisson_deviance(
                        task.y_validation,
                        np.full_like(task.y_validation, task.y_train.mean()),
                    ),
                    8,
                ),
                "finalTestMetricLabel": "Mean Poisson deviance",
                "finalTestMetricValue": round(
                    _poisson_deviance(
                        task.y_test,
                        np.full_like(task.y_test, task.y_train.mean()),
                    ),
                    8,
                ),
                "disclosure": (
                    "This is a leakage-safe descriptive reference, not a tuned model. "
                    "Its constant is computed from outer training targets only."
                ),
            },
        }
    )
    return record


def fit_nemos(task: ModelTaskArrays) -> dict[str, Any]:
    import jax  # type: ignore[import-untyped]
    import nemos as nmo  # type: ignore[import-untyped]

    jax.config.update("jax_enable_x64", True)
    estimator = nmo.glm.GLM(
        observation_model="Poisson",
        regularizer="Ridge",
        regularizer_strength=0.01,
        solver_name="LBFGS",
        solver_kwargs={"maxiter": 500, "tol": 1e-8},
    )
    estimator.fit(task.x_train, task.y_train)
    validation_predicted = np.clip(
        np.asarray(estimator.predict(task.x_validation)), 1e-9, None
    )
    predicted = np.clip(np.asarray(estimator.predict(task.x_test)), 1e-9, None)
    record = _base_model_record(
        label="NeMoS Poisson GLM",
        observed=task.y_test,
        predicted=predicted,
        validation_observed=task.y_validation,
        validation_predicted=validation_predicted,
        validation_use="reported only; estimator configuration is fixed in the script",
        disclosure=(
            "Actually fit with NeMoS/JAX on the common standardized behavioral "
            "features and chronological training block. The held-out trace is a "
            "prediction demonstration, not an estimate of causal encoding."
        ),
    )
    record.update(
        {
            "software": {
                "nemos": _version("nemos"),
                "jax": _version("jax"),
            },
            "configuration": {
                "family": "Poisson",
                "inverseLink": "exponential",
                "regularizer": "Ridge",
                "regularizerStrength": 0.01,
                "solver": "LBFGS",
                "maxIter": 500,
                "tolerance": 1e-8,
                "jaxEnableX64": True,
            },
            "coefficients": _round(np.asarray(estimator.coef_), 8),
            "intercept": _round(np.asarray(estimator.intercept_), 8),
            "basisExplorer": _build_nemos_basis_explorer(nmo),
        }
    )
    return record


def _build_nemos_basis_explorer(nmo: Any) -> dict[str, Any]:
    """Evaluate real NeMoS basis matrices without changing the frozen GLM."""

    input_grid = np.linspace(0.0, 1.0, 41, dtype=float)
    sample_indices = np.asarray([0, 10, 20, 30, 40], dtype=int)
    configurations: list[dict[str, Any]] = []
    basis_specs = (
        ("raised-cosine", "RaisedCosineLinearEval", {"width": 2.0}),
        ("b-spline", "BSplineEval", {"order": 3}),
        ("m-spline", "MSplineEval", {"order": 3}),
    )
    for short_name, class_name, parameters in basis_specs:
        for basis_count in (4, 6):
            basis_class = getattr(nmo.basis, class_name)
            basis = basis_class(
                n_basis_funcs=basis_count,
                bounds=(0.0, 1.0),
                fill_value=0.0,
                **parameters,
            )
            matrix = np.asarray(basis.compute_features(input_grid), dtype=float)
            if matrix.shape != (len(input_grid), basis_count):
                raise ValueError(
                    f"Unexpected {class_name} design shape: {matrix.shape}."
                )
            if not np.all(np.isfinite(matrix)):
                raise ValueError(f"{class_name} generated non-finite basis values.")
            identifier = f"{short_name}-{basis_count}"
            feature_names = [
                f"{identifier}:basis-{index + 1}" for index in range(basis_count)
            ]
            configurations.append(
                {
                    "id": identifier,
                    "basisType": class_name,
                    "nBasisFunctions": basis_count,
                    "parameters": {
                        **parameters,
                        "bounds": [0.0, 1.0],
                        "fillValue": 0.0,
                    },
                    "featureNames": feature_names,
                    "curves": [
                        {
                            "feature": feature_names[index],
                            "values": _round(matrix[:, index], 8),
                        }
                        for index in range(basis_count)
                    ],
                    "designMatrixSample": {
                        "input": _round(input_grid[sample_indices], 8),
                        "rows": [_round(matrix[index], 8) for index in sample_indices],
                    },
                }
            )
    return {
        "status": "computed",
        "software": {"nemos": _version("nemos")},
        "usedInFrozenFit": False,
        "inputUnit": "normalized illustrative coordinate from 0 to 1",
        "inputGrid": _round(input_grid, 8),
        "configurations": configurations,
        "disclosure": (
            "These curves and design-matrix rows were evaluated with the installed "
            "NeMoS basis API. They form an isolated basis explorer and were not used "
            "to fit or score the frozen four-raw-feature GLM."
        ),
    }


def _train_pytorch_candidate(
    task: ModelTaskArrays,
    *,
    candidate_id: str,
    label: str,
    hidden_units: int | None,
    weight_decay: float,
) -> tuple[Any, np.ndarray, dict[str, Any]]:
    import torch  # type: ignore[import-untyped]

    torch.use_deterministic_algorithms(True)
    torch.manual_seed(PIPELINE_SEED)
    torch.set_num_threads(1)
    train_x = torch.tensor(task.x_train, dtype=torch.float64)
    train_y = torch.tensor(task.y_train[:, None], dtype=torch.float64)
    validation_x = torch.tensor(task.x_validation, dtype=torch.float64)
    validation_y = torch.tensor(task.y_validation[:, None], dtype=torch.float64)
    if hidden_units is None:
        network = torch.nn.Sequential(
            torch.nn.Linear(4, 1, dtype=torch.float64),
            torch.nn.Softplus(),
        )
        architecture = [4, 1]
        hidden_activation: str | None = None
    else:
        network = torch.nn.Sequential(
            torch.nn.Linear(4, hidden_units, dtype=torch.float64),
            torch.nn.Tanh(),
            torch.nn.Linear(hidden_units, 1, dtype=torch.float64),
            torch.nn.Softplus(),
        )
        architecture = [4, hidden_units, 1]
        hidden_activation = "tanh"
    optimizer = torch.optim.Adam(
        network.parameters(), lr=0.02, weight_decay=weight_decay
    )
    loss_function = torch.nn.PoissonNLLLoss(log_input=False, full=False, eps=1e-9)
    checkpoints: list[dict[str, Any]] = []
    maximum_epochs = 400
    patience = 50
    best_validation_loss = math.inf
    best_epoch = 0
    best_state: dict[str, Any] | None = None
    best_training_loss = math.inf
    epochs_without_improvement = 0
    completed_epochs = 0
    for epoch in range(1, maximum_epochs + 1):
        optimizer.zero_grad(set_to_none=True)
        loss = loss_function(network(train_x), train_y)
        loss.backward()
        optimizer.step()
        with torch.no_grad():
            training_loss = float(loss_function(network(train_x), train_y).detach())
            validation_loss = float(
                loss_function(network(validation_x), validation_y).detach()
            )
        completed_epochs = epoch
        if validation_loss < best_validation_loss - 1e-8:
            best_validation_loss = validation_loss
            best_training_loss = training_loss
            best_epoch = epoch
            best_state = {
                name: value.detach().clone()
                for name, value in network.state_dict().items()
            }
            epochs_without_improvement = 0
        else:
            epochs_without_improvement += 1
        if epoch == 1 or epoch % 20 == 0:
            checkpoints.append(
                {
                    "epoch": epoch,
                    "trainingPoissonNll": round(training_loss, 8),
                    "validationPoissonNll": round(validation_loss, 8),
                }
            )
        if epochs_without_improvement >= patience:
            break
    if best_state is None:
        raise RuntimeError("PyTorch early stopping did not record a checkpoint.")
    network.load_state_dict(best_state)
    network.eval()
    with torch.no_grad():
        validation_predicted = network(validation_x).squeeze(1).cpu().numpy()
    if not any(row["epoch"] == best_epoch for row in checkpoints):
        checkpoints.append(
            {
                "epoch": best_epoch,
                "trainingPoissonNll": round(best_training_loss, 8),
                "validationPoissonNll": round(best_validation_loss, 8),
                "selectedCheckpoint": True,
            }
        )
        checkpoints.sort(key=lambda row: int(row["epoch"]))
    comparison = {
        "id": candidate_id,
        "label": label,
        "architecture": architecture,
        "hiddenActivation": hidden_activation,
        "outputActivation": "softplus",
        "optimizer": "Adam",
        "learningRate": 0.02,
        "weightDecay": weight_decay,
        "parameterCount": int(
            sum(parameter.numel() for parameter in network.parameters())
        ),
        "seed": PIPELINE_SEED,
        "device": "cpu",
        "dtype": "float64",
        "deterministicAlgorithms": True,
        "bestEpoch": best_epoch,
        "completedEpochs": completed_epochs,
        "validationMetricLabel": "Mean Poisson deviance",
        "validationMetricValue": round(
            _poisson_deviance(task.y_validation, validation_predicted), 8
        ),
        "trainingCheckpoints": checkpoints,
        "selected": False,
    }
    return network, validation_predicted, comparison


def fit_pytorch(task: ModelTaskArrays) -> dict[str, Any]:
    import torch  # type: ignore[import-untyped]

    candidate_specs = (
        {
            "candidate_id": "linear-softplus",
            "label": "No-hidden-layer 4–1 softplus model",
            "hidden_units": None,
            "weight_decay": 0.0,
        },
        {
            "candidate_id": "mlp-4-8-1",
            "label": "Small 4–8–1 tanh/softplus MLP",
            "hidden_units": 8,
            "weight_decay": 0.0,
        },
        {
            "candidate_id": "mlp-4-8-1-regularized",
            "label": "Regularized 4–8–1 tanh/softplus MLP",
            "hidden_units": 8,
            "weight_decay": PYTORCH_WEIGHT_DECAY,
        },
    )
    fitted: list[tuple[Any, np.ndarray, dict[str, Any]]] = []
    for specification in candidate_specs:
        fitted.append(_train_pytorch_candidate(task, **specification))
    selected_index = min(
        range(len(fitted)),
        key=lambda index: (
            fitted[index][2]["validationMetricValue"],
            fitted[index][2]["parameterCount"],
            fitted[index][2]["id"],
        ),
    )
    selected_network, validation_predicted, selected_comparison = fitted[selected_index]
    selected_comparison["selected"] = True
    test_x = torch.tensor(task.x_test, dtype=torch.float64)
    predicted: np.ndarray | None = None
    for index, (network, _, comparison) in enumerate(fitted):
        network.eval()
        with torch.no_grad():
            candidate_predicted = network(test_x).squeeze(1).cpu().numpy()
        comparison["finalTestMetricLabel"] = "Mean Poisson deviance"
        comparison["finalTestMetricValue"] = round(
            _poisson_deviance(task.y_test, candidate_predicted), 8
        )
        if index == selected_index:
            predicted = candidate_predicted
    if predicted is None:
        raise RuntimeError("PyTorch architecture selection did not yield predictions.")
    selected_network.eval()
    with torch.no_grad():
        activation_input = test_x[0:1]
        if len(selected_network) == 4:
            hidden_pre_activation = selected_network[0](activation_input)
            hidden_activation = selected_network[1](hidden_pre_activation)
            output_pre_activation = selected_network[2](hidden_activation)
            activation_prediction = selected_network[3](output_pre_activation)
        else:
            hidden_pre_activation = torch.empty((1, 0), dtype=torch.float64)
            hidden_activation = torch.empty((1, 0), dtype=torch.float64)
            output_pre_activation = selected_network[0](activation_input)
            activation_prediction = selected_network[1](output_pre_activation)
    record = _base_model_record(
        label="PyTorch validation-selected Poisson network",
        observed=task.y_test,
        predicted=predicted,
        validation_observed=task.y_validation,
        validation_predicted=validation_predicted,
        validation_use=(
            "selected each early-stopping checkpoint and then the architecture by "
            "outer-validation Poisson deviance; final-test values were recorded only "
            "after that rule selected the main lane"
        ),
        disclosure=(
            "Actually trained on CPU with deterministic PyTorch operations, "
            "three predeclared architectures, and the common chronological split. "
            "The main lane is selected only by validation deviance; the held-out "
            "scores are not used to choose an architecture."
        ),
    )
    record.update(
        {
            "software": {"torch": _version("torch")},
            "configuration": {
                "device": "cpu",
                "dtype": "float64",
                "architecture": selected_comparison["architecture"],
                "hiddenActivation": selected_comparison["hiddenActivation"],
                "outputActivation": "softplus",
                "optimizer": "Adam",
                "learningRate": 0.02,
                "weightDecay": selected_comparison["weightDecay"],
                "maximumEpochs": 400,
                "completedEpochs": selected_comparison["completedEpochs"],
                "earlyStoppingPatience": 50,
                "bestEpoch": selected_comparison["bestEpoch"],
                "seed": PIPELINE_SEED,
                "deterministicAlgorithms": True,
            },
            "selectionRule": (
                "Choose the lowest outer-validation mean Poisson deviance after "
                "candidate-specific early stopping; a tie favors fewer parameters, "
                "then lexical candidate id. Final-test metrics do not participate."
            ),
            "selectedArchitectureId": selected_comparison["id"],
            "architectureComparisons": [row[2] for row in fitted],
            "trainingCheckpoints": selected_comparison["trainingCheckpoints"],
            "activationExample": {
                "testRow": TEST_START,
                "featureOrder": ["x", "y", "trailing speed", "current t1c1 count"],
                "standardizedInput": _round(
                    activation_input.squeeze(0).cpu().numpy(), 8
                ),
                "hiddenPreActivation": _round(
                    hidden_pre_activation.squeeze(0).cpu().numpy(), 8
                ),
                "hiddenActivation": _round(
                    hidden_activation.squeeze(0).cpu().numpy(), 8
                ),
                "outputPreActivation": round(float(output_pre_activation.item()), 8),
                "predictedCount": round(float(activation_prediction.item()), 8),
            },
        }
    )
    return record


def fit_stan(
    task: ModelTaskArrays,
    *,
    stan_file: Path,
    output_dir: Path,
) -> dict[str, Any]:
    import cmdstanpy  # type: ignore[import-untyped]

    # A stride keeps this uncertainty lane small while preserving chronological order.
    stan_stride = 5
    stan_x = task.x_train[::stan_stride]
    stan_y = task.y_train[::stan_stride].astype(int)
    output_dir.mkdir(parents=True, exist_ok=True)
    cached_stan_file = output_dir / stan_file.name
    if (
        not cached_stan_file.exists()
        or cached_stan_file.read_bytes() != stan_file.read_bytes()
    ):
        shutil.copyfile(stan_file, cached_stan_file)
    model = cmdstanpy.CmdStanModel(stan_file=str(cached_stan_file))
    fit = model.sample(
        data={
            "N": len(stan_y),
            "K": task.x_train.shape[1],
            "X": stan_x,
            "y": stan_y,
        },
        seed=PIPELINE_SEED,
        chains=2,
        parallel_chains=1,
        iter_warmup=500,
        iter_sampling=500,
        adapt_delta=0.9,
        show_progress=False,
        output_dir=str(output_dir),
    )
    alpha_draws = np.asarray(fit.stan_variable("alpha"), dtype=float)
    beta_draws = np.asarray(fit.stan_variable("beta"), dtype=float)
    linear_predictor = alpha_draws[:, None] + beta_draws @ task.x_test.T
    posterior_rates = np.exp(np.clip(linear_predictor, -20, 20))
    predicted = posterior_rates.mean(axis=0)
    validation_linear_predictor = (
        alpha_draws[:, None] + beta_draws @ task.x_validation.T
    )
    validation_predicted = np.exp(np.clip(validation_linear_predictor, -20, 20)).mean(
        axis=0
    )
    summary = fit.summary()
    parameter_rows = summary.loc[["alpha", "beta[1]", "beta[2]", "beta[3]", "beta[4]"]]
    parameter_draws = np.column_stack((alpha_draws, beta_draws))
    posterior_display_stride = 5
    method_variables = fit.method_variables()
    divergent = int(np.asarray(method_variables["divergent__"]).sum())
    predictive_rng = np.random.default_rng(POSTERIOR_PREDICTIVE_SEED)
    predictive_counts = predictive_rng.poisson(posterior_rates)
    predictive_quantiles = np.quantile(predictive_counts, [0.05, 0.5, 0.95], axis=0)
    predictive_totals = predictive_counts.sum(axis=1)
    total_quantiles = np.quantile(predictive_totals, [0.05, 0.5, 0.95])
    within_interval = (task.y_test >= predictive_quantiles[0]) & (
        task.y_test <= predictive_quantiles[2]
    )
    display_rows = np.arange(TEST_START, task.full_row_count, DISPLAY_STRIDE)
    record = _base_model_record(
        label="Stan uncertainty lane",
        observed=task.y_test,
        predicted=predicted,
        validation_observed=task.y_validation,
        validation_predicted=validation_predicted,
        validation_use="reported only; posterior configuration is fixed in the script",
        disclosure=(
            "Actually sampled with CmdStan using explicit weakly informative priors. "
            "The posterior-mean held-out rate is shown for comparison; posterior "
            "diagnostics and the training subsample stride remain attached."
        ),
    )
    record.update(
        {
            "software": {
                "cmdstanpy": _version("cmdstanpy"),
                "cmdstan": ".".join(
                    str(part) for part in (cmdstanpy.cmdstan_version() or ())
                ),
            },
            "configuration": {
                "likelihood": "Poisson-log",
                "priors": {"alpha": "normal(-1, 1.5)", "beta": "normal(0, 1)"},
                "chains": 2,
                "warmupDrawsPerChain": 500,
                "samplingDrawsPerChain": 500,
                "adaptDelta": 0.9,
                "seed": PIPELINE_SEED,
                "trainingSubsampleStride": stan_stride,
            },
            "posteriorSummary": [
                {
                    "parameter": str(index),
                    "mean": round(float(row["Mean"]), 7),
                    "sd": round(float(row["StdDev"]), 7),
                    "q05": round(float(row["5%"]), 7),
                    "median": round(float(row["50%"]), 7),
                    "q95": round(float(row["95%"]), 7),
                    "rHat": round(float(row["R_hat"]), 6),
                    "essBulk": round(float(row["ESS_bulk"]), 3),
                }
                for index, row in parameter_rows.iterrows()
            ],
            "posteriorDrawSamples": {
                "kind": "Deterministically strided actual posterior draws",
                "drawStride": posterior_display_stride,
                "sourceDrawCount": int(len(alpha_draws)),
                "displayDrawCount": int(
                    len(parameter_draws[::posterior_display_stride])
                ),
                "parameters": [
                    {
                        "parameter": str(parameter),
                        "values": _round(
                            parameter_draws[::posterior_display_stride, index], 7
                        ),
                    }
                    for index, parameter in enumerate(parameter_rows.index)
                ],
                "disclosure": (
                    "These are every fifth actual post-warmup draw from the fitted "
                    "Stan chains, stored only to support an inspectable posterior "
                    "distribution chart. Summary diagnostics use all draws."
                ),
            },
            "diagnostics": {
                "divergentTransitions": divergent,
                "maxRHat": round(float(parameter_rows["R_hat"].max()), 6),
                "minBulkEss": round(float(parameter_rows["ESS_bulk"].min()), 3),
            },
            "posteriorPredictiveCheck": {
                "kind": "Held-out posterior predictive simulation",
                "seed": POSTERIOR_PREDICTIVE_SEED,
                "posteriorDrawCount": int(len(alpha_draws)),
                "heldOutSampleCount": int(len(task.y_test)),
                "displayStride": DISPLAY_STRIDE,
                "displayRows": [int(value) for value in display_rows.tolist()],
                "predictiveCountQ05": _round(
                    predictive_quantiles[0, ::DISPLAY_STRIDE], 6
                ),
                "predictiveCountMedian": _round(
                    predictive_quantiles[1, ::DISPLAY_STRIDE], 6
                ),
                "predictiveCountQ95": _round(
                    predictive_quantiles[2, ::DISPLAY_STRIDE], 6
                ),
                "totalCount": {
                    "observed": int(task.y_test.sum()),
                    "q05": round(float(total_quantiles[0]), 6),
                    "median": round(float(total_quantiles[1]), 6),
                    "q95": round(float(total_quantiles[2]), 6),
                },
                "intervalCoverage": {
                    "interval": "central empirical 90% posterior predictive interval",
                    "coveredRows": int(within_interval.sum()),
                    "totalRows": int(len(within_interval)),
                    "rate": round(float(within_interval.mean()), 8),
                },
                "disclosure": (
                    "These are predictive count intervals from actual posterior "
                    "draws and deterministic Poisson simulations, not confidence "
                    "intervals. They assess this fitted model on one held-out block "
                    "and do not establish calibration beyond it."
                ),
            },
        }
    )
    return record


def run_aligned_models(
    artifact: dict[str, Any], *, repo_root: Path, output_dir: Path
) -> dict[str, Any]:
    task = prepare_model_task(artifact)
    models = {
        "nemos": fit_nemos(task),
        "sklearn": fit_sklearn(task),
        "pytorch": fit_pytorch(task),
        "stan": fit_stan(
            task,
            stan_file=repo_root / "python" / "stan" / "poisson_encoding.stan",
            output_dir=output_dir,
        ),
    }
    return {
        "schemaVersion": ARTIFACT_SCHEMA_VERSION,
        "status": "computed",
        "origin": "public-derived",
        "execution": "precomputed",
        "seed": PIPELINE_SEED,
        "inputFingerprint": model_input_fingerprint(artifact),
        "task": {
            "version": "next-bin-count-v2",
            "researchQuestion": (
                "How well do current-bin x position, y position, trailing speed, "
                "and current t1c1 count predict t1c1 spike count in the next 100 ms bin?"
            ),
            "target": "t1c1 next-bin spike count",
            "binSizeSeconds": 0.1,
            "features": [
                "x position (m)",
                "y position (m)",
                "trailing speed from current and prior positions (m/s)",
                "current-bin t1c1 spike count",
            ],
            "preprocessing": "Training-block mean/standard-deviation only",
            "split": {
                "totalRows": task.full_row_count,
                "train": [0, TRAIN_END],
                "validation": [TRAIN_END, VALIDATION_END],
                "temporalGap": [VALIDATION_END, TEST_START],
                "test": [TEST_START, task.full_row_count],
                "gapSeconds": 30.0,
                "rowConvention": "zero-based half-open intervals",
            },
            "metric": "Mean Poisson deviance on all 1,499 held-out rows",
            "validationUse": (
                "The frozen validation block selects PyTorch early stopping "
                "checkpoints and the "
                "predeclared PyTorch architecture. scikit-learn alpha is selected "
                "only by chronological folds inside training; NeMoS and Stan remain "
                "fixed and report validation without tuning on it."
            ),
            "displayStride": DISPLAY_STRIDE,
            "featureMean": _round(task.feature_mean, 8),
            "featureScale": _round(task.feature_scale, 8),
            "pynappleCountVerification": task.pynapple_count_verified,
        },
        "software": {
            "python": platform.python_version(),
            "numpy": _version("numpy"),
            "pynapple": _version("pynapple"),
        },
        "generatorProvenance": {
            "gitCommit": _git_commit(repo_root),
            "files": [
                {
                    "path": relative_path,
                    "sha256": _sha256(repo_root / relative_path),
                }
                for relative_path in (
                    "scripts/run_models.py",
                    "python/neurostack_explorer/modeling.py",
                    "python/stan/poisson_encoding.stan",
                    "requirements.lock",
                )
            ],
            "disclosure": (
                "Hashes identify the exact generator sources and lock file. The Git "
                "commit remains null until this repository has a reviewed commit."
            ),
        },
        "models": models,
        "limitations": [
            "One public recording and one selected unit do not support population generalization.",
            "Behavioral covariates are observational; predictive fit is not causal evidence.",
            "Scores compare one fixed split and should not be interpreted as benchmark rankings.",
            "Displayed traces are deterministically decimated by five; metrics use all held-out rows.",
        ],
    }


def load_artifact(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_model_results(path: Path, payload: dict[str, Any]) -> None:
    write_json(path, payload, compact=True)
