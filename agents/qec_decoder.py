"""
QEC Decoder — Neural Network vs Lookup Table for Error Classification

Trains on hardware syndrome data from [[4,2,2]] detection code experiments.
Compares NN (MLPClassifier) against simple lookup-table decoding.

Usage:
    # Called automatically from experiment_daemon.py analyze_detection_code()
    from agents.qec_decoder import train_and_evaluate_decoders
    results = train_and_evaluate_decoders(X, y_labels)

    # Standalone test with synthetic data:
    python agents/qec_decoder.py
"""

import numpy as np
from collections import Counter


# ─── Lookup Table Decoder ────────────────────────────────────────────────

# Syndrome -> error type mapping for [[4,2,2]] code
# X-syndrome (XXXX) detects Z errors, Z-syndrome (ZZZZ) detects X errors
SYNDROME_TABLE = {
    (0, 0): "none",
    (0, 1): "X_error",   # ZZZZ triggered -> X-type error
    (1, 0): "Z_error",   # XXXX triggered -> Z-type error
    (1, 1): "Y_error",   # Both triggered -> Y-type error
}


def lookup_decode(X):
    """Decode using syndrome lookup table.

    Args:
        X: array of shape (n_samples, 6) — [d0, d1, d2, d3, sx, sz]

    Returns:
        List of predicted error type strings.
    """
    predictions = []
    for row in X:
        sx, sz = int(row[4]), int(row[5])
        error_class = SYNDROME_TABLE.get((sx, sz), "unknown")
        predictions.append(error_class)
    return predictions


def lookup_decode_detailed(X):
    """Decode with qubit-level detail using data bits + syndrome.

    Uses syndrome to determine error type, then uses data bits to guess
    which qubit was affected (majority vote on which bit differs).
    """
    predictions = []
    for row in X:
        d = [int(row[i]) for i in range(4)]
        sx, sz = int(row[4]), int(row[5])

        if sx == 0 and sz == 0:
            predictions.append("none")
        elif sx == 0 and sz == 1:
            # X error — find which data qubit flipped
            # In |0000> + X error, exactly one data bit should be 1
            ones = [i for i in range(4) if d[i] == 1]
            if len(ones) == 1:
                predictions.append(f"X_d{ones[0]}")
            else:
                predictions.append("X_d0")  # fallback
        elif sx == 1 and sz == 0:
            # Z error — can't determine which qubit from Z-basis measurement alone
            predictions.append("Z_d0")  # fallback — Z errors don't flip data bits
        else:
            # Y error
            ones = [i for i in range(4) if d[i] == 1]
            if len(ones) == 1:
                predictions.append(f"Y_d{ones[0]}")
            else:
                predictions.append("Y_d0")
    return predictions


# ─── Neural Network Decoder ─────────────────────────────────────────────

def train_nn_decoder(X_train, y_train):
    """Train an MLP classifier on syndrome + data bit features.

    Args:
        X_train: array (n, 6) — [d0, d1, d2, d3, sx, sz]
        y_train: list of error type labels

    Returns:
        Trained MLPClassifier.
    """
    from sklearn.neural_network import MLPClassifier

    clf = MLPClassifier(
        hidden_layer_sizes=(32, 16),
        max_iter=500,
        random_state=42,
    )
    # Ensure labels are plain Python strings (not np.str_)
    y_train = [str(label) for label in y_train]
    clf.fit(X_train, y_train)
    return clf


# ─── Evaluation ──────────────────────────────────────────────────────────

def evaluate_decoder(y_true, y_pred, label="decoder"):
    """Compute accuracy, per-class precision/recall."""
    from sklearn.metrics import accuracy_score, classification_report

    acc = accuracy_score(y_true, y_pred)

    # Per-class stats
    classes = sorted(set(y_true))
    per_class = {}
    for cls in classes:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == cls and p == cls)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != cls and p == cls)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == cls and p != cls)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        per_class[cls] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "support": sum(1 for t in y_true if t == cls),
        }

    return {
        "accuracy": round(acc, 4),
        "per_class": per_class,
    }


def train_and_evaluate_decoders(X, y_labels):
    """Train and compare NN vs lookup-table decoders with cross-validation.

    Args:
        X: numpy array (n_samples, 6) — [d0, d1, d2, d3, sx, sz]
        y_labels: list of error type strings

    Returns:
        Dict with comparison metrics.
    """
    from sklearn.model_selection import StratifiedKFold

    X = np.array(X, dtype=float)
    # Ensure y is a plain Python string list (not np.str_)
    y_list = [str(label) for label in y_labels]
    y = np.array(y_list)

    # Cross-validation
    n_classes = len(set(y_list))
    n_folds = min(5, n_classes)
    if n_folds < 2:
        n_folds = 2

    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)

    nn_accuracies = []
    lookup_accuracies = []
    lookup_detailed_accuracies = []

    for train_idx, test_idx in skf.split(X, y):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx].tolist(), y[test_idx].tolist()

        # NN decoder
        try:
            clf = train_nn_decoder(X_train, y_train)
            nn_pred = clf.predict(X_test).tolist()
            nn_acc = sum(1 for t, p in zip(y_test, nn_pred) if t == p) / len(y_test)
            nn_accuracies.append(nn_acc)
        except Exception as e:
            import sys
            print(f"NN training error in CV fold: {e}", file=sys.stderr)
            nn_accuracies.append(0)

        # Lookup decoders
        lookup_pred = lookup_decode(X_test)
        # Map detailed labels to coarse for fair comparison
        coarse_map = {}
        for label in set(y_test):
            if label == "none":
                coarse_map[label] = "none"
            elif label.startswith("X_"):
                coarse_map[label] = "X_error"
            elif label.startswith("Z_"):
                coarse_map[label] = "Z_error"
            elif label.startswith("Y_"):
                coarse_map[label] = "Y_error"
            else:
                coarse_map[label] = label
        y_test_coarse = [coarse_map.get(l, l) for l in y_test]
        lookup_acc = sum(1 for t, p in zip(y_test_coarse, lookup_pred) if t == p) / len(y_test)
        lookup_accuracies.append(lookup_acc)

        # Detailed lookup (qubit-level)
        lookup_det_pred = lookup_decode_detailed(X_test)
        lookup_det_acc = sum(1 for t, p in zip(y_test, lookup_det_pred) if t == p) / len(y_test)
        lookup_detailed_accuracies.append(lookup_det_acc)

    # Final evaluation on full data
    try:
        final_clf = train_nn_decoder(X, y_list)
        nn_full_pred = final_clf.predict(X).tolist()
        nn_eval = evaluate_decoder(y_list, nn_full_pred, "nn")
    except Exception:
        nn_eval = {"accuracy": 0, "per_class": {}}

    lookup_full_pred = lookup_decode_detailed(X)
    lookup_eval = evaluate_decoder(y_list, lookup_full_pred, "lookup")

    return {
        "nn_accuracy": round(np.mean(nn_accuracies), 4) if nn_accuracies else 0,
        "nn_accuracy_std": round(np.std(nn_accuracies), 4) if nn_accuracies else 0,
        "lookup_accuracy": round(np.mean(lookup_accuracies), 4) if lookup_accuracies else 0,
        "lookup_detailed_accuracy": round(np.mean(lookup_detailed_accuracies), 4) if lookup_detailed_accuracies else 0,
        "n_folds": n_folds,
        "n_samples": len(X),
        "n_classes": len(set(y)),
        "class_distribution": dict(Counter(y)),
        "nn_full_eval": nn_eval,
        "lookup_full_eval": lookup_eval,
    }


# ─── Synthetic Data Generator ───────────────────────────────────────────

def generate_synthetic_data(n_per_class=500, noise_rate=0.1):
    """Generate synthetic training data simulating noisy hardware.

    Args:
        n_per_class: samples per error class
        noise_rate: probability of bit flip in measurement

    Returns:
        X, y arrays.
    """
    rng = np.random.RandomState(42)
    X_all = []
    y_all = []

    error_configs = {
        "none":  {"data": [0, 0, 0, 0], "sx": 0, "sz": 0},
        "X_d0":  {"data": [1, 0, 0, 0], "sx": 0, "sz": 1},
        "X_d1":  {"data": [0, 1, 0, 0], "sx": 0, "sz": 1},
        "X_d2":  {"data": [0, 0, 1, 0], "sx": 0, "sz": 1},
        "X_d3":  {"data": [0, 0, 0, 1], "sx": 0, "sz": 1},
        "Z_d0":  {"data": [0, 0, 0, 0], "sx": 1, "sz": 0},
        "Z_d1":  {"data": [0, 0, 0, 0], "sx": 1, "sz": 0},
        "Z_d2":  {"data": [0, 0, 0, 0], "sx": 1, "sz": 0},
        "Z_d3":  {"data": [0, 0, 0, 0], "sx": 1, "sz": 0},
        "Y_d0":  {"data": [1, 0, 0, 0], "sx": 1, "sz": 1},
        "Y_d1":  {"data": [0, 1, 0, 0], "sx": 1, "sz": 1},
        "Y_d2":  {"data": [0, 0, 1, 0], "sx": 1, "sz": 1},
        "Y_d3":  {"data": [0, 0, 0, 1], "sx": 1, "sz": 1},
    }

    for label, config in error_configs.items():
        ideal = np.array(config["data"] + [config["sx"], config["sz"]])
        for _ in range(n_per_class):
            sample = ideal.copy()
            # Apply noise
            noise_mask = rng.random(6) < noise_rate
            sample = np.where(noise_mask, 1 - sample, sample)
            X_all.append(sample)
            y_all.append(label)

    X_all = np.array(X_all)
    y_all = np.array(y_all)

    # Shuffle
    idx = rng.permutation(len(X_all))
    return X_all[idx], y_all[idx]


# ─── Main (standalone test) ─────────────────────────────────────────────

if __name__ == "__main__":
    print("QEC Decoder — Synthetic Data Test")
    print("=" * 50)

    X, y = generate_synthetic_data(n_per_class=500, noise_rate=0.1)
    print(f"Generated {len(X)} samples, {len(set(y))} classes")
    print(f"Class distribution: {dict(Counter(y))}")

    results = train_and_evaluate_decoders(X, y.tolist())

    print(f"\nNN accuracy (5-fold CV):     {results['nn_accuracy']:.1%} +/- {results['nn_accuracy_std']:.1%}")
    print(f"Lookup accuracy (coarse):    {results['lookup_accuracy']:.1%}")
    print(f"Lookup accuracy (detailed):  {results['lookup_detailed_accuracy']:.1%}")

    print("\nNN per-class performance:")
    for cls, stats in sorted(results["nn_full_eval"]["per_class"].items()):
        print(f"  {cls:12s}: precision={stats['precision']:.2f}, recall={stats['recall']:.2f}, n={stats['support']}")

    print("\nLookup per-class performance:")
    for cls, stats in sorted(results["lookup_full_eval"]["per_class"].items()):
        print(f"  {cls:12s}: precision={stats['precision']:.2f}, recall={stats['recall']:.2f}, n={stats['support']}")
