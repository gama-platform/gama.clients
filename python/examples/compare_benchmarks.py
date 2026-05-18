"""Compare benchmark runs stored in benchmark_results.json.

Usage:
    python examples/compare_benchmarks.py [results.json] [--labels A B C ...] [--no-plot]

Without --labels, all labels found in the file are compared.
Outputs a numerical comparison table and (if matplotlib is available) box plots.
"""
import argparse
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path


# ---------- Loading & grouping ----------

def load_results(filename):
    with open(filename) as f:
        return json.load(f)


def group_by_label(entries):
    """Returns {label: {'step_expr': [run, ...], 'connection': [run, ...]}}"""
    grouped = defaultdict(lambda: {"step_expr": [], "connection": []})
    for r in entries:
        label = r.get("label", "unknown")
        if r.get("type") == "connection_benchmark":
            grouped[label]["connection"].append(r)
        else:
            grouped[label]["step_expr"].append(r)
    return grouped


# ---------- Aggregation ----------

def _percentile(xs, p):
    xs = sorted(xs)
    if not xs:
        return 0.0
    k = int(len(xs) * p / 100)
    return xs[min(k, len(xs) - 1)]


def per_run_medians(runs, key):
    """Compute the median (in ms) of each run's `key` field, return list of medians."""
    medians = []
    for r in runs:
        times_ms = [t * 1000 for t in r.get(key, [])]
        if times_ms:
            medians.append(statistics.median(times_ms))
    return medians


def aggregate_medians(medians):
    """Aggregate a list of per-run medians into summary stats."""
    if not medians:
        return None
    return {
        "n_runs": len(medians),
        "min": min(medians),
        "max": max(medians),
        "mean": statistics.mean(medians),
        "median": statistics.median(medians),
        "stdev": statistics.stdev(medians) if len(medians) > 1 else 0.0,
    }


def pooled_samples(runs, key):
    """Concatenate all individual samples (in ms) across runs."""
    out = []
    for r in runs:
        out.extend(t * 1000 for t in r.get(key, []))
    return out


def aggregate_pooled(samples):
    if not samples:
        return None
    samples_sorted = sorted(samples)
    return {
        "n_samples": len(samples),
        "min": samples_sorted[0],
        "max": samples_sorted[-1],
        "median": statistics.median(samples),
        "mean": statistics.mean(samples),
        "p95": _percentile(samples, 95),
        "p99": _percentile(samples, 99),
    }


# ---------- Statistical comparison ----------

def mann_whitney_u(a, b):
    """Compute Mann-Whitney U test statistic and approximate two-sided p-value.
    Returns (U, p_approx). Lower p means more significant difference.
    No scipy dependency — uses normal approximation, valid for n >= ~20.
    """
    import math
    n1, n2 = len(a), len(b)
    if n1 == 0 or n2 == 0:
        return None, None
    combined = sorted([(v, "a") for v in a] + [(v, "b") for v in b])
    # assign ranks, handling ties via average rank
    ranks = {}
    i = 0
    while i < len(combined):
        j = i
        while j + 1 < len(combined) and combined[j + 1][0] == combined[i][0]:
            j += 1
        avg_rank = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[k] = avg_rank
        i = j + 1
    rank_sum_a = sum(ranks[idx] for idx, (_, src) in enumerate(combined) if src == "a")
    U_a = rank_sum_a - n1 * (n1 + 1) / 2
    U_b = n1 * n2 - U_a
    U = min(U_a, U_b)
    # Normal approximation
    mean_U = n1 * n2 / 2
    sd_U = math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12)
    if sd_U == 0:
        return U, 1.0
    z = (U - mean_U) / sd_U
    # two-sided p-value via standard normal CDF approximation
    p = math.erfc(abs(z) / math.sqrt(2))
    return U, p


# ---------- Text reporting ----------

def fmt(v, prec=3):
    if v is None:
        return "  -  "
    return f"{v:.{prec}f}"


def print_metric_table(metric_name, per_label_medians_aggregate, per_label_pooled):
    """Print one section per metric with per-label rows."""
    print(f"\n=== {metric_name} ===")
    header = f"{'Label':<35} {'#runs':>6} {'#samp':>7} {'med-of-meds':>13} {'stdev':>8} {'pool-med':>10} {'pool-p95':>10} {'pool-p99':>10}"
    print(header)
    print("-" * len(header))
    for label, agg in per_label_medians_aggregate.items():
        pool = per_label_pooled.get(label)
        if agg is None and pool is None:
            continue
        if agg is None:
            print(f"{label:<35} {'-':>6} {pool['n_samples']:>7} {'-':>13} {'-':>8} "
                  f"{fmt(pool['median']):>10} {fmt(pool['p95']):>10} {fmt(pool['p99']):>10}")
            continue
        print(f"{label:<35} {agg['n_runs']:>6} {pool['n_samples']:>7} "
              f"{fmt(agg['median']):>13} {fmt(agg['stdev']):>8} "
              f"{fmt(pool['median']):>10} {fmt(pool['p95']):>10} {fmt(pool['p99']):>10}")


def find_baseline_label(labels):
    """Returns the first label starting with 'baseline' (case-insensitive), or None."""
    for l in labels:
        if l.lower().startswith("baseline"):
            return l
    return None


def print_pairwise_comparison(metric_name, per_label_pooled_samples, per_label_medians):
    """Pairwise comparison between labels: delta + Mann-Whitney p-value.

    If a label starts with 'baseline', it is used as the reference (A) and every
    other label is compared against it. Otherwise all pairs are compared.
    """
    labels = [l for l in per_label_pooled_samples if per_label_pooled_samples[l]]
    if len(labels) < 2:
        return

    baseline = find_baseline_label(labels)
    if baseline is not None:
        pairs = [(baseline, lb) for lb in labels if lb != baseline]
        ref_note = f"  (reference: '{baseline}')"
    else:
        pairs = [(labels[i], labels[j]) for i in range(len(labels)) for j in range(i + 1, len(labels))]
        ref_note = "  (no 'baseline*' label found — all pairs compared)"

    print(f"\n  Pairwise comparison ({metric_name}):{ref_note}")
    print(f"    {'A vs B':<60} {'delta median':>10} {'delta %':>8} {'M-W p':>10}")
    for la, lb in pairs:
        sa = per_label_pooled_samples[la]
        sb = per_label_pooled_samples[lb]
        med_a = statistics.median(sa)
        med_b = statistics.median(sb)
        delta = med_b - med_a
        pct = (delta / med_a * 100) if med_a else 0.0
        _, p = mann_whitney_u(sa, sb)
        p_str = f"{p:.2e}" if p is not None else "-"
        sig = ""
        if p is not None:
            if p < 0.001:
                sig = " ***"
            elif p < 0.01:
                sig = " **"
            elif p < 0.05:
                sig = " *"
        pair = f"'{la}' vs '{lb}'"
        print(f"    {pair:<60} {delta:+10.3f} {pct:+7.1f}% {p_str:>10}{sig}")


# ---------- Plotting ----------

def make_plots(per_label_pooled_samples, out_path):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("\n(matplotlib not installed; skipping plot)")
        return

    metrics = ["step", "expr", "connect", "close"]
    titles = ["Step time", "Expression time", "Connection time", "Close time"]
    fig, axes = plt.subplots(2, 2, figsize=(14, 9))
    axes = axes.flatten()

    for ax, metric, title in zip(axes, metrics, titles):
        data = []
        labels = []
        for label, by_metric in per_label_pooled_samples.items():
            samples = by_metric.get(metric)
            if samples:
                data.append(samples)
                labels.append(label)
        if not data:
            ax.set_title(f"{title} (no data)")
            ax.set_axis_off()
            continue
        bp = ax.boxplot(data, tick_labels=labels, showfliers=False, whis=(5, 95))
        ax.set_title(f"{title} (box: Q1/median/Q3, whiskers: 5%/95%)")
        ax.set_ylabel("ms")
        ax.tick_params(axis="x", rotation=20)
        ax.grid(True, axis="y", alpha=0.3)

    fig.suptitle("Benchmark comparison", fontsize=14)
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    print(f"\nPlot saved to: {out_path}")


# ---------- Main ----------

def main():
    parser = argparse.ArgumentParser(description="Compare benchmark runs.")
    parser.add_argument("results_file", nargs="?", default="benchmark_results.json",
                        help="Path to results JSON (default: benchmark_results.json)")
    parser.add_argument("--labels", nargs="+", default=None,
                        help="Only compare these labels (default: all)")
    parser.add_argument("--no-plot", action="store_true", help="Skip plotting")
    parser.add_argument("--plot-out", default="benchmark_comparison.png",
                        help="Output path for the plot")
    args = parser.parse_args()

    entries = load_results(args.results_file)
    grouped = group_by_label(entries)
    all_labels = list(grouped.keys())
    if args.labels:
        # Preserve user order, filter to existing
        labels = [l for l in args.labels if l in grouped]
        missing = [l for l in args.labels if l not in grouped]
        if missing:
            print(f"WARNING: labels not found: {missing}", file=sys.stderr)
    else:
        labels = all_labels

    if not labels:
        print(f"No labels to compare. Available: {all_labels}", file=sys.stderr)
        sys.exit(1)

    # If a label starts with 'baseline', put it first so it appears first in the tables
    # and is used as the reference in pairwise comparisons.
    baseline = find_baseline_label(labels)
    if baseline is not None and labels[0] != baseline:
        labels = [baseline] + [l for l in labels if l != baseline]

    print(f"=== Benchmark comparison: {args.results_file} ===")
    print(f"Comparing labels: {labels}")
    if baseline is not None:
        print(f"Reference baseline: '{baseline}'")

    # Each metric has a key in the step/expr or connection runs
    metric_specs = [
        ("Step time",        "step_expr",  "step_times"),
        ("Expression time",  "step_expr",  "expr_times"),
        ("Connection time",  "connection", "connect_times"),
        ("Close time",       "connection", "close_times"),
    ]

    # Map: per_label_pooled_samples[label][metric_key_short] = [samples...]
    per_label_pooled_for_plot = {l: {} for l in labels}

    for metric_name, run_type, key in metric_specs:
        per_label_medians = {}
        per_label_medians_agg = {}
        per_label_pooled = {}
        per_label_pooled_samples = {}
        for label in labels:
            runs = grouped[label].get(run_type, [])
            medians = per_run_medians(runs, key)
            per_label_medians[label] = medians
            per_label_medians_agg[label] = aggregate_medians(medians)
            samples = pooled_samples(runs, key)
            per_label_pooled_samples[label] = samples
            per_label_pooled[label] = aggregate_pooled(samples)

            # Save samples for plotting under a short metric name
            short = key.replace("_times", "")
            per_label_pooled_for_plot[label][short] = samples

        if any(v for v in per_label_pooled_samples.values()):
            print_metric_table(metric_name, per_label_medians_agg, per_label_pooled)
            print_pairwise_comparison(metric_name, per_label_pooled_samples, per_label_medians)

    # Connection failures summary
    print("\n=== Connection failures ===")
    for label in labels:
        runs = grouped[label].get("connection", [])
        total_fail = sum(r.get("n_failures", 0) for r in runs)
        total_n = sum(r.get("n_connections", 0) for r in runs)
        if total_n:
            print(f"  {label:<35} {total_fail}/{total_n} failures ({100*total_fail/total_n:.1f}%)")

    if not args.no_plot:
        make_plots(per_label_pooled_for_plot, args.plot_out)

    print("\nSignificance codes: *** p<0.001  ** p<0.01  * p<0.05")
    print("delta % is relative to label A. Negative delta means B is faster.")


if __name__ == "__main__":
    main()
