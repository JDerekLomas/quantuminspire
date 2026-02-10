"""
Replication Analyzer — Compares experimental results against published values.

Takes a replication result and a set of published claims, computes discrepancies,
classifies failure modes, and generates structured comparison reports.

Usage:
    python agents/replication_analyzer.py --paper sagastizabal2019
    python agents/replication_analyzer.py --paper sagastizabal2019 --format markdown
    python agents/replication_analyzer.py --all
"""

import json
import argparse
from pathlib import Path
from datetime import datetime

AGENTS_DIR = Path(__file__).parent
PROJECT_DIR = AGENTS_DIR.parent
RESULTS_DIR = PROJECT_DIR / "experiments" / "results"
REPORTS_DIR = PROJECT_DIR / "research" / "replication-reports"

# ─── Published Claims Registry ────────────────────────────────────────────

PUBLISHED_CLAIMS = {
    "sagastizabal2019": {
        "paper": {
            "title": "Error Mitigation by Symmetry Verification on a VQE",
            "authors": "Sagastizabal et al.",
            "journal": "Phys. Rev. A 100, 010302(R) (2019)",
            "arxiv": "1902.11258",
            "institution": "QuTech / TU Delft",
            "hardware": "2-qubit transmon (Starmon-5)",
            "url": "https://arxiv.org/abs/1902.11258",
        },
        "claims": [
            {
                "id": "vqe-h2-equilibrium",
                "description": "H2 ground state energy at equilibrium (R=0.735 A)",
                "metric": "energy_hartree",
                "published_value": -1.1373,
                "published_error": 0.002,  # ~1.3 kcal/mol, within chemical accuracy
                "unit": "Hartree",
                "figure": "Fig. 2",
                "conditions": {
                    "bond_distance": 0.735,
                    "basis_set": "STO-3G",
                    "qubit_encoding": "BK + tapering (2 qubit)",
                    "error_mitigation": "symmetry verification (parity post-selection)",
                },
            },
            {
                "id": "symmetry-verification-improvement",
                "description": "Symmetry verification reduces VQE error vs raw noisy measurement",
                "metric": "improvement_factor",
                "published_value": 2.0,  # approximately 2x improvement claimed
                "published_error": 1.0,  # rough
                "unit": "x improvement",
                "figure": "Fig. 3",
                "conditions": {
                    "noise_model": "depolarizing (device-like)",
                },
            },
            {
                "id": "chemical-accuracy",
                "description": "VQE achieves chemical accuracy (< 1.6 mHa) with error mitigation",
                "metric": "chemical_accuracy",
                "published_value": True,
                "unit": "boolean",
                "figure": "Fig. 2",
                "conditions": {
                    "error_mitigation": "symmetry verification",
                    "bond_distance": 0.735,
                },
            },
        ],
        "result_files": {
            "emulator": "vqe-equilibrium-001.json",
            "ibm": "vqe-equilibrium-001-ibm.json",
            "tuna9": "vqe-equilibrium-001-tuna9.json",
        },
    },
    "kandala2017": {
        "paper": {
            "title": "Hardware-efficient variational quantum eigensolver for small molecules and quantum magnets",
            "authors": "Kandala et al.",
            "journal": "Nature 549, 242-246 (2017)",
            "arxiv": "1704.05018",
            "institution": "IBM Research",
            "hardware": "6-qubit superconducting (ibmqx2, ibmqx4)",
            "url": "https://arxiv.org/abs/1704.05018",
        },
        "claims": [
            {
                "id": "h2-ground-state",
                "description": "H2 ground state energy at equilibrium",
                "metric": "energy_hartree",
                "published_value": -1.1362,
                "published_error": 0.005,
                "unit": "Hartree",
                "figure": "Fig. 3a",
                "conditions": {
                    "bond_distance": 0.75,
                    "basis_set": "STO-3G",
                    "qubit_encoding": "parity mapping (2 qubit)",
                    "error_mitigation": "none (raw hardware)",
                },
            },
            {
                "id": "lih-ground-state",
                "description": "LiH ground state energy at equilibrium",
                "metric": "energy_hartree",
                "published_value": -7.882,
                "published_error": 0.02,
                "unit": "Hartree",
                "figure": "Fig. 3b",
                "conditions": {
                    "bond_distance": 1.6,
                    "basis_set": "STO-3G",
                    "qubit_encoding": "parity mapping (4 qubit)",
                },
            },
        ],
        "result_files": {},  # not yet implemented
    },
    "peruzzo2014": {
        "paper": {
            "title": "A variational eigenvalue solver on a photonic quantum processor",
            "authors": "Peruzzo et al.",
            "journal": "Nature Communications 5, 4213 (2014)",
            "arxiv": "1304.3061",
            "institution": "Various (Bristol, MIT, Google)",
            "hardware": "Photonic quantum processor",
            "url": "https://arxiv.org/abs/1304.3061",
        },
        "claims": [
            {
                "id": "heh-equilibrium-energy",
                "description": "HeH+ ground state energy near equilibrium (R=0.75 A)",
                "metric": "vqe_ideal_energy",
                "published_value": -2.8462,
                "published_error": 0.003,
                "unit": "Hartree",
                "figure": "Fig. 2",
                "conditions": {
                    "bond_distance": 0.75,
                    "basis_set": "STO-3G",
                    "qubit_encoding": "JW (4 qubit)",
                    "ansatz": "DoubleExcitation",
                },
            },
            {
                "id": "heh-potential-curve",
                "description": "HeH+ potential energy curve matches FCI across bond distances",
                "metric": "mae_ideal_hartree",
                "published_value": 0.0,
                "published_error": 0.001,
                "unit": "Hartree MAE",
                "figure": "Fig. 2",
                "conditions": {
                    "bond_distances": "0.5-3.0 A",
                    "basis_set": "STO-3G",
                },
            },
            {
                "id": "heh-noise-resilience",
                "description": "Symmetry verification improves noisy VQE",
                "metric": "sv_improvement",
                "published_value": 1.5,
                "published_error": 1.0,
                "unit": "x improvement",
                "figure": "Fig. 3",
                "conditions": {
                    "noise_model": "depolarizing",
                    "error_mitigation": "symmetry verification",
                },
            },
        ],
        "result_files": {
            "emulator": "peruzzo2014-heh-sweep.json",
        },
    },
    "cross2019": {
        "paper": {
            "title": "Validating quantum computers using randomized model circuits",
            "authors": "Cross et al.",
            "journal": "Phys. Rev. A 100, 032328 (2019)",
            "arxiv": "1811.12926",
            "institution": "IBM Research",
            "hardware": "IBM superconducting (various)",
            "url": "https://arxiv.org/abs/1811.12926",
        },
        "claims": [
            {
                "id": "qv-pass-2q",
                "description": "2-qubit QV circuits pass heavy output test (> 2/3)",
                "metric": "qv_pass_2q",
                "published_value": True,
                "unit": "boolean",
                "figure": "Fig. 3",
                "conditions": {
                    "qubit_count": 2,
                    "threshold": "2/3",
                },
            },
            {
                "id": "qv-pass-3q",
                "description": "3-qubit QV circuits pass heavy output test (> 2/3)",
                "metric": "qv_pass_3q",
                "published_value": True,
                "unit": "boolean",
                "figure": "Fig. 3",
                "conditions": {
                    "qubit_count": 3,
                    "threshold": "2/3",
                },
            },
            {
                "id": "rb-gate-fidelity",
                "description": "Randomized benchmarking gives gate fidelity > 99%",
                "metric": "gate_fidelity",
                "published_value": 0.99,
                "published_error": 0.01,
                "unit": "fidelity",
                "figure": "Section III",
                "conditions": {
                    "protocol": "1-qubit Clifford RB",
                },
            },
        ],
        "result_files": {
            "emulator": "qv-001.json",
            "emulator_rb": "rb-1qubit-001.json",
        },
    },
}

# ─── Failure Mode Classification ─────────────────────────────────────────

FAILURE_MODES = {
    "noise_dominated": {
        "description": "Hardware noise overwhelms the signal",
        "indicators": ["error > 10x published", "fidelity < 0.5"],
        "severity": "high",
    },
    "partial_noise": {
        "description": "Hardware noise degrades result but qualitative behavior preserved",
        "indicators": ["error 2-10x published", "fidelity 0.5-0.9"],
        "severity": "medium",
    },
    "circuit_translation": {
        "description": "Circuit translation to target hardware introduced errors",
        "indicators": ["emulator works but hardware fails", "unexpected gate counts"],
        "severity": "medium",
    },
    "parameter_mismatch": {
        "description": "Published parameters don't match what's needed for the target hardware",
        "indicators": ["wrong qubit mapping", "different native gate set"],
        "severity": "low",
    },
    "missing_detail": {
        "description": "Paper doesn't provide enough detail to reproduce exactly",
        "indicators": ["had to guess parameters", "circuit not fully specified"],
        "severity": "low",
    },
    "api_version_drift": {
        "description": "Software API has changed since paper publication",
        "indicators": ["deprecated functions", "different return formats"],
        "severity": "low",
    },
    "success": {
        "description": "Replication matches published results within error bars",
        "indicators": ["error within published_error"],
        "severity": "none",
    },
}


def classify_failure(claim, measured_value, backend):
    """Classify the failure mode for a single claim comparison."""
    published = claim["published_value"]
    published_err = claim.get("published_error", 0)

    if claim["unit"] == "boolean":
        if measured_value == published:
            return "success"
        return "partial_noise"

    # For "improvement" and "fidelity" metrics, higher is better
    # Exceeding published value is success, not failure
    higher_is_better = claim["unit"] in ("x improvement", "fidelity")
    if higher_is_better and measured_value >= published:
        return "success"

    if published_err > 0:
        relative_error = abs(measured_value - published) / abs(published_err)
    else:
        relative_error = abs(measured_value - published) / max(abs(published), 1e-10)

    if relative_error <= 1.0:
        return "success"
    elif relative_error <= 3.0:
        return "partial_noise"
    elif backend == "emulator" and relative_error > 3.0:
        return "circuit_translation"
    elif relative_error > 10.0:
        return "noise_dominated"
    else:
        return "partial_noise"


# ─── Report Generation ────────────────────────────────────────────────────

def load_result(filename):
    """Load a result file."""
    path = RESULTS_DIR / filename
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)


def extract_metric(result, metric_name):
    """Extract a metric value from a result file."""
    analysis = result.get("analysis", {})

    if metric_name == "energy_hartree":
        return analysis.get("energy_hartree") or analysis.get("energy_postselected")
    elif metric_name == "chemical_accuracy":
        return analysis.get("chemical_accuracy")
    elif metric_name == "improvement_factor":
        raw = analysis.get("energy_raw")
        ps = analysis.get("energy_postselected") or analysis.get("energy_hartree")
        fci = analysis.get("fci_energy", -1.1373)
        if raw and ps and fci:
            raw_err = abs(raw - fci)
            ps_err = abs(ps - fci)
            if ps_err > 0:
                return raw_err / ps_err
        return None
    elif metric_name == "fidelity":
        return analysis.get("fidelity")
    elif metric_name == "gate_fidelity":
        return analysis.get("gate_fidelity")

    # Quantum Volume metrics
    elif metric_name == "qv_pass_2q":
        qv_results = analysis.get("results_by_qubit_count", {})
        r = qv_results.get("2", {})
        return r.get("passed")
    elif metric_name == "qv_pass_3q":
        qv_results = analysis.get("results_by_qubit_count", {})
        r = qv_results.get("3", {})
        return r.get("passed")

    # Peruzzo HeH+ sweep metrics
    elif metric_name == "vqe_ideal_energy":
        # Find equilibrium point (R=0.75) from sweep results
        results_by_dist = result.get("results_by_distance", [])
        for r in results_by_dist:
            if abs(r.get("bond_distance", 0) - 0.75) < 0.05:
                return r.get("vqe_ideal")
        return None
    elif metric_name == "mae_ideal_hartree":
        summary = result.get("summary", {})
        return summary.get("mae_ideal_hartree")
    elif metric_name == "sv_improvement":
        summary = result.get("summary", {})
        mae_noisy = summary.get("mae_noisy_hartree", 0)
        mae_sv = summary.get("mae_sv_hartree", 0)
        if mae_sv > 0:
            return mae_noisy / mae_sv
        return None

    return analysis.get(metric_name)


def generate_report(paper_id):
    """Generate a full replication comparison report."""
    if paper_id not in PUBLISHED_CLAIMS:
        print(f"Unknown paper: {paper_id}")
        return None

    paper_data = PUBLISHED_CLAIMS[paper_id]
    paper = paper_data["paper"]
    claims = paper_data["claims"]
    result_files = paper_data["result_files"]

    # Load all available results
    # Some papers have multiple result files per backend (e.g., cross2019 has qv + rb)
    results = {}
    for backend_key, filename in result_files.items():
        result = load_result(filename)
        if result:
            results[backend_key] = result

    report = {
        "paper_id": paper_id,
        "paper": paper,
        "generated": datetime.now().isoformat(),
        "backends_tested": list(results.keys()),
        "comparisons": [],
        "summary": {},
    }

    total_claims = 0
    successes = 0
    failure_counts = {}

    for claim in claims:
        comparison = {
            "claim_id": claim["id"],
            "description": claim["description"],
            "published_value": claim["published_value"],
            "published_error": claim.get("published_error"),
            "unit": claim["unit"],
            "figure": claim.get("figure"),
            "results_by_backend": {},
        }

        for backend_key, result in results.items():
            # Normalize backend name (emulator_rb -> emulator for display)
            backend = backend_key.split("_")[0] if "_" in backend_key else backend_key

            # Skip irrelevant result files for this claim
            # e.g., don't try to extract QV metrics from RB result file
            if backend_key == "emulator_rb" and not claim["metric"].startswith("gate_fidelity"):
                continue
            if backend_key == "emulator" and claim["metric"] == "gate_fidelity" and "emulator_rb" in results:
                continue

            measured = extract_metric(result, claim["metric"])
            if measured is None:
                comparison["results_by_backend"][backend] = {
                    "status": "no_data",
                    "note": f"Metric '{claim['metric']}' not found in result",
                }
                continue

            if claim["unit"] == "boolean":
                discrepancy = 0 if measured == claim["published_value"] else 1
                within_error = measured == claim["published_value"]
            else:
                discrepancy = measured - claim["published_value"]
                pub_err = claim.get("published_error", 0)
                # For "higher is better" metrics, exceeding is within expectations
                higher_is_better = claim["unit"] in ("x improvement", "fidelity")
                if higher_is_better and measured >= claim["published_value"]:
                    within_error = True
                else:
                    within_error = abs(discrepancy) <= pub_err

            failure_mode = classify_failure(claim, measured, backend)
            total_claims += 1
            if failure_mode == "success":
                successes += 1
            failure_counts[failure_mode] = failure_counts.get(failure_mode, 0) + 1

            comparison["results_by_backend"][backend] = {
                "measured_value": measured,
                "discrepancy": round(discrepancy, 6) if isinstance(discrepancy, float) else discrepancy,
                "within_published_error": within_error,
                "failure_mode": failure_mode,
                "failure_description": FAILURE_MODES[failure_mode]["description"],
                "severity": FAILURE_MODES[failure_mode]["severity"],
            }

            # Add extra context for energy comparisons
            if claim["unit"] == "Hartree" and isinstance(discrepancy, float):
                comparison["results_by_backend"][backend]["error_kcal_mol"] = round(
                    abs(discrepancy) * 627.509, 2
                )

        report["comparisons"].append(comparison)

    report["summary"] = {
        "total_claims_tested": total_claims,
        "successes": successes,
        "success_rate": round(successes / max(total_claims, 1), 2),
        "failure_mode_counts": failure_counts,
        "backends_tested": list(results.keys()),
    }

    return report


def format_markdown(report):
    """Format a report as markdown."""
    if not report:
        return "No report data."

    paper = report["paper"]
    lines = [
        f"# Replication Report: {paper['title']}",
        "",
        f"**Authors**: {paper['authors']}",
        f"**Journal**: {paper['journal']}",
        f"**arXiv**: [{paper['arxiv']}](https://arxiv.org/abs/{paper['arxiv']})",
        f"**Original hardware**: {paper['hardware']}",
        f"**Report generated**: {report['generated'][:10]}",
        "",
        "---",
        "",
        "## Summary",
        "",
        f"- **Claims tested**: {report['summary']['total_claims_tested']}",
        f"- **Successful replications**: {report['summary']['successes']}",
        f"- **Success rate**: {report['summary']['success_rate']:.0%}",
        f"- **Backends tested**: {', '.join(report['backends_tested'])}",
        "",
    ]

    if report["summary"]["failure_mode_counts"]:
        lines.append("### Failure mode breakdown")
        lines.append("")
        lines.append("| Mode | Count | Description |")
        lines.append("|------|-------|-------------|")
        for mode, count in sorted(report["summary"]["failure_mode_counts"].items()):
            desc = FAILURE_MODES.get(mode, {}).get("description", "Unknown")
            lines.append(f"| {mode} | {count} | {desc} |")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Detailed Comparisons")
    lines.append("")

    for comp in report["comparisons"]:
        lines.append(f"### {comp['description']}")
        lines.append("")
        if comp.get("figure"):
            lines.append(f"*Published in {comp['figure']}*")
            lines.append("")

        pub_val = comp["published_value"]
        pub_err = comp.get("published_error")
        if isinstance(pub_val, bool):
            lines.append(f"**Published**: {'Yes' if pub_val else 'No'}")
        elif pub_err:
            lines.append(f"**Published**: {pub_val} +/- {pub_err} {comp['unit']}")
        else:
            lines.append(f"**Published**: {pub_val} {comp['unit']}")
        lines.append("")

        if comp["results_by_backend"]:
            lines.append("| Backend | Measured | Discrepancy | kcal/mol | Status | Failure Mode |")
            lines.append("|---------|----------|-------------|----------|--------|--------------|")

            for backend, res in comp["results_by_backend"].items():
                if res.get("status") == "no_data":
                    lines.append(f"| {backend} | — | — | — | no data | — |")
                    continue

                measured = res["measured_value"]
                disc = res["discrepancy"]
                kcal = res.get("error_kcal_mol", "—")
                within = "PASS" if res["within_published_error"] else "FAIL"
                mode = res["failure_mode"]

                if isinstance(measured, bool):
                    measured_str = "Yes" if measured else "No"
                    disc_str = "match" if disc == 0 else "mismatch"
                else:
                    measured_str = f"{measured:.4f}"
                    disc_str = f"{disc:+.4f}"

                lines.append(f"| {backend} | {measured_str} | {disc_str} | {kcal} | {within} | {mode} |")

            lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Analysis")
    lines.append("")

    # Generate analysis based on results
    backends = report["backends_tested"]
    if "emulator" in backends:
        emu_results = [
            c["results_by_backend"].get("emulator", {})
            for c in report["comparisons"]
        ]
        emu_successes = sum(1 for r in emu_results if r.get("failure_mode") == "success")
        lines.append(f"**Emulator**: {emu_successes}/{len(emu_results)} claims matched. ")
        if emu_successes == len(emu_results):
            lines.append("The simulation pipeline correctly reproduces the published physics.")
        else:
            lines.append("Some claims not matched even in simulation — indicates protocol differences.")
        lines.append("")

    for backend in ["ibm", "tuna9"]:
        if backend not in backends:
            continue
        hw_results = [
            c["results_by_backend"].get(backend, {})
            for c in report["comparisons"]
        ]
        hw_successes = sum(1 for r in hw_results if r.get("failure_mode") == "success")
        hw_errors = [
            r.get("error_kcal_mol", 0)
            for r in hw_results
            if isinstance(r.get("error_kcal_mol"), (int, float))
        ]
        avg_err = sum(hw_errors) / len(hw_errors) if hw_errors else 0

        label = "IBM Quantum" if backend == "ibm" else "QI Tuna-9"
        lines.append(f"**{label}**: {hw_successes}/{len(hw_results)} claims matched. ")
        if hw_errors:
            lines.append(f"Average energy error: {avg_err:.1f} kcal/mol.")
        lines.append("")

    return "\n".join(lines)


def format_json(report):
    """Format a report as JSON."""
    return json.dumps(report, indent=2)


def run_analysis(paper_id, fmt="markdown"):
    """Run analysis and output report."""
    report = generate_report(paper_id)
    if not report:
        return

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    if fmt == "markdown":
        output = format_markdown(report)
        out_file = REPORTS_DIR / f"{paper_id}.md"
    else:
        output = format_json(report)
        out_file = REPORTS_DIR / f"{paper_id}.json"

    with open(out_file, "w") as f:
        f.write(output)

    print(output)
    print(f"\nReport written to {out_file}")

    # Also save JSON alongside markdown
    if fmt == "markdown":
        json_file = REPORTS_DIR / f"{paper_id}.json"
        with open(json_file, "w") as f:
            json.dump(report, f, indent=2)

    return report


def main():
    parser = argparse.ArgumentParser(description="Replication Analyzer")
    parser.add_argument("--paper", type=str, help="Paper ID to analyze")
    parser.add_argument("--format", type=str, default="markdown", choices=["markdown", "json"])
    parser.add_argument("--all", action="store_true", help="Analyze all papers with results")
    parser.add_argument("--list", action="store_true", help="List available papers")
    args = parser.parse_args()

    if args.list:
        print("\nAvailable papers for analysis:")
        for pid, data in PUBLISHED_CLAIMS.items():
            p = data["paper"]
            n_results = sum(1 for f in data["result_files"].values() if (RESULTS_DIR / f).exists())
            n_claims = len(data["claims"])
            status = f"{n_results} backends" if n_results > 0 else "no results"
            print(f"  {pid}: {p['title'][:60]}... ({n_claims} claims, {status})")
        return

    if args.all:
        for pid in PUBLISHED_CLAIMS:
            data = PUBLISHED_CLAIMS[pid]
            has_results = any((RESULTS_DIR / f).exists() for f in data["result_files"].values())
            if has_results:
                print(f"\n{'='*60}")
                print(f"Analyzing: {pid}")
                print(f"{'='*60}\n")
                run_analysis(pid, args.format)
        return

    if args.paper:
        run_analysis(args.paper, args.format)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
