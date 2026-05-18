import asyncio
import time
import json
import os
import sys
from pathlib import Path
from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
import json as json_parser

async def async_command_answer_handler(message):
    pass

async def gama_server_message_handler(message):
    pass

def get_version():
    try:
        pyproject_path = Path(__file__).parents[1] / "pyproject.toml"
        with open(pyproject_path, "r") as f:
            for line in f:
                if line.startswith("version ="):
                    return line.split("=")[1].strip().replace('"', '')
    except:
        return "unknown"
    return "unknown"

async def run_benchmark(iterations=1000, label="run"):
    server_url = "localhost"
    server_port = 6868
    gaml_file_path = str(Path(__file__).parents[1] / "examples" / "gaml" / "complete.gaml")
    
    # We use no compression as it's the fastest for localhost
    client = GamaSyncClient(server_url, server_port, async_command_answer_handler, gama_server_message_handler)
    client.connect()
    
    print(f"Loading complex model: {gaml_file_path}")
    response = client.load(gaml_file_path, "expe")
    exp_id = response["content"]
    
    # Warmup
    print("Warmup...")
    for _ in range(iterations//10):
        client.step(exp_id, sync=True)
        client.expression(exp_id, "people collect ([\"name\"::each.name, \"age\"::each.age])")
    print(f"Starting benchmark with {iterations} iterations...")
    
    # We measure: 
    # 1. Step time (GAMA execution)
    # 2. Reading expression time (Data transfer + Parsing)
    # 3. Writing expression time (Data transfer + Parsing)
    # This is a common scenario for gama-client
    
    step_times = []
    expr_times = []
    
    start_total = time.perf_counter()
    
    for i in range(iterations):
            
        t0 = time.perf_counter()
        client.step(exp_id, sync=True)
        t1 = time.perf_counter()
        step_times.append(t1 - t0)
        
        # This expression returns a list of maps, which grows over time in complete.gaml
        t2 = time.perf_counter()
        expr_res = client.expression(exp_id, "people collect ([\"name\"::each.name, \"age\"::each.age])")
        t3 = time.perf_counter()
        expr_times.append(t3 - t2)
        
        # Verify we actually got data
        if not expr_res.get("type") == MessageTypes.CommandExecutedSuccessfully.value:
             print(f"Warning: couldn't get data at iteration {i}")
       



    end_total = time.perf_counter()
    
    total_duration = end_total - start_total
    avg_step = sum(step_times) / len(step_times)
    avg_expr = sum(expr_times) / len(expr_times)
    
    print(f"\nBenchmark Finished!")
    print(f"Total duration: {total_duration:.4f}s")
    print(f"Avg Step time:  {avg_step*1000:.2f}ms")
    print(f"Avg Expr time:  {avg_expr*1000:.2f}ms (First payload parsing)")
    
    client.stop(exp_id)
    client.close_connection()
    
    results = {
        "label": label,
        "version": get_version(),
        "timestamp": time.time(),
        "iterations": iterations,
        "total_duration": total_duration,
        "avg_step_ms": avg_step * 1000,
        "avg_expr_ms": avg_expr * 1000,
        "step_times": step_times,
        "expr_times": expr_times
    }
    
    return results

def save_results(results, filename="benchmark_results.json"):
    all_data = []
    if os.path.exists(filename):
        try:
            with open(filename, "r") as f:
                all_data = json.load(f)
        except:
            pass
            
    all_data.append(results)
    
    with open(filename, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"Results saved to {filename}")

def _percentile(xs, p):
    xs = sorted(xs)
    if not xs:
        return 0.0
    k = int(len(xs) * p / 100)
    return xs[min(k, len(xs) - 1)]


def _summarize_run(times_ms):
    """Compute median + p95 + trimmed mean (excluding top 1%) on a list of times in ms."""
    import statistics
    if not times_ms:
        return {}
    trimmed = sorted(times_ms)[: max(1, int(len(times_ms) * 0.99))]
    return {
        "median": statistics.median(times_ms),
        "p95": _percentile(times_ms, 95),
        "p99": _percentile(times_ms, 99),
        "trimmed_mean": statistics.mean(trimmed),
        "mean": statistics.mean(times_ms),
        "stdev": statistics.stdev(times_ms) if len(times_ms) > 1 else 0.0,
    }


def _print_aggregate(label, runs):
    """Compare N runs of the same label using their medians (stable across runs)."""
    import statistics
    step_medians = [r["step_summary"]["median"] for r in runs]
    expr_medians = [r["expr_summary"]["median"] for r in runs]
    print(f"\n=== Aggregate over {len(runs)} runs of '{label}' ===")
    print(f"Step median (ms): min={min(step_medians):.3f} max={max(step_medians):.3f} "
          f"mean={statistics.mean(step_medians):.3f} "
          f"stdev={statistics.stdev(step_medians) if len(step_medians) > 1 else 0:.3f}")
    print(f"Expr median (ms): min={min(expr_medians):.3f} max={max(expr_medians):.3f} "
          f"mean={statistics.mean(expr_medians):.3f} "
          f"stdev={statistics.stdev(expr_medians) if len(expr_medians) > 1 else 0:.3f}")


async def main():
    label = sys.argv[1] if len(sys.argv) > 1 else "baseline"
    iterations = int(sys.argv[2]) if len(sys.argv) > 2 else 10000
    n_runs = int(sys.argv[3]) if len(sys.argv) > 3 else 1

    print(f"=== GAMA Client Performance Benchmark ===")
    print(f"Label: {label}")
    print(f"Version: {get_version()}")
    print(f"Runs: {n_runs} x {iterations} iterations")

    all_runs = []
    for run_idx in range(n_runs):
        if n_runs > 1:
            print(f"\n--- Run {run_idx + 1}/{n_runs} ---")
        results = await run_benchmark(iterations, label)
        # Compute richer stats for each run
        step_ms = [t * 1000 for t in results["step_times"]]
        expr_ms = [t * 1000 for t in results["expr_times"]]
        results["step_summary"] = _summarize_run(step_ms)
        results["expr_summary"] = _summarize_run(expr_ms)
        print(f"  step  median={results['step_summary']['median']:.3f}ms  "
              f"p95={results['step_summary']['p95']:.3f}ms  "
              f"trimmed_mean={results['step_summary']['trimmed_mean']:.3f}ms")
        print(f"  expr  median={results['expr_summary']['median']:.3f}ms  "
              f"p95={results['expr_summary']['p95']:.3f}ms  "
              f"trimmed_mean={results['expr_summary']['trimmed_mean']:.3f}ms")
        save_results(results)
        all_runs.append(results)

    if n_runs > 1:
        _print_aggregate(label, all_runs)


if __name__ == "__main__":
    asyncio.run(main())
