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

async def run_connection_benchmark(n_connections=30, warmup=5, label="run"):
    """Measure connection (and disconnection) speed by opening/closing N clients.
    Performs `warmup` unmeasured cycles first to warm up JIT/caches/server state."""
    server_url = "localhost"
    server_port = 6868

    # Warmup (not measured) — same role as the step/expr warmup: prime the JVM JIT
    # and the OS caches so the measured cycles reflect steady state.
    if warmup > 0:
        print(f"Connection warmup: {warmup} cycles (not measured)...")
        for _ in range(warmup):
            try:
                client = GamaSyncClient(server_url, server_port, async_command_answer_handler, gama_server_message_handler)
                client.connect()
                client.close_connection()
            except Exception:
                pass  # ignore warmup failures

    print(f"Connection benchmark: {n_connections} connect/close cycles...")
    connect_times = []
    close_times = []
    failures = []

    for i in range(n_connections):
        try:
            client = GamaSyncClient(server_url, server_port, async_command_answer_handler, gama_server_message_handler)
            t0 = time.perf_counter()
            client.connect()
            t1 = time.perf_counter()
            connect_times.append(t1 - t0)

            t2 = time.perf_counter()
            client.close_connection()
            t3 = time.perf_counter()
            close_times.append(t3 - t2)
        except Exception as e:
            failures.append((i, type(e).__name__, str(e)[:80]))

    print(f"Connection benchmark done: {len(connect_times)} successes, {len(failures)} failures")

    results = {
        "type": "connection_benchmark",
        "label": label,
        "version": get_version(),
        "timestamp": time.time(),
        "n_connections": n_connections,
        "n_successes": len(connect_times),
        "n_failures": len(failures),
        "failures": failures,
        "connect_times": connect_times,
        "close_times": close_times,
    }

    if connect_times:
        connect_ms = [t * 1000 for t in connect_times]
        close_ms = [t * 1000 for t in close_times]
        results["connect_summary"] = _summarize_run(connect_ms)
        results["close_summary"] = _summarize_run(close_ms)
        cs = results["connect_summary"]
        clo = results["close_summary"]
        print(f"  connect  median={cs['median']:.2f}ms  mean={cs['mean']:.2f}ms  "
              f"p95={cs['p95']:.2f}ms  max={max(connect_ms):.2f}ms")
        print(f"  close    median={clo['median']:.2f}ms  mean={clo['mean']:.2f}ms  "
              f"p95={clo['p95']:.2f}ms  max={max(close_ms):.2f}ms")
    if failures:
        print(f"  failures: {failures}")

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
    print(f"\n=== Aggregate over {len(runs)} step/expr runs of '{label}' ===")
    print(f"Step median (ms): min={min(step_medians):.3f} max={max(step_medians):.3f} "
          f"mean={statistics.mean(step_medians):.3f} "
          f"stdev={statistics.stdev(step_medians) if len(step_medians) > 1 else 0:.3f}")
    print(f"Expr median (ms): min={min(expr_medians):.3f} max={max(expr_medians):.3f} "
          f"mean={statistics.mean(expr_medians):.3f} "
          f"stdev={statistics.stdev(expr_medians) if len(expr_medians) > 1 else 0:.3f}")


def _print_connection_aggregate(label, runs):
    """Compare N runs of the connection benchmark using their medians."""
    import statistics
    runs_with_summary = [r for r in runs if "connect_summary" in r]
    if not runs_with_summary:
        return
    connect_medians = [r["connect_summary"]["median"] for r in runs_with_summary]
    close_medians = [r["close_summary"]["median"] for r in runs_with_summary]
    total_failures = sum(r["n_failures"] for r in runs)
    print(f"\n=== Aggregate over {len(runs)} connection runs of '{label}' ===")
    print(f"Connect median (ms): min={min(connect_medians):.3f} max={max(connect_medians):.3f} "
          f"mean={statistics.mean(connect_medians):.3f} "
          f"stdev={statistics.stdev(connect_medians) if len(connect_medians) > 1 else 0:.3f}")
    print(f"Close median (ms):   min={min(close_medians):.3f} max={max(close_medians):.3f} "
          f"mean={statistics.mean(close_medians):.3f} "
          f"stdev={statistics.stdev(close_medians) if len(close_medians) > 1 else 0:.3f}")
    print(f"Total failures across all runs: {total_failures}")


async def main():
    label = sys.argv[1] if len(sys.argv) > 1 else "baseline"
    iterations = int(sys.argv[2]) if len(sys.argv) > 2 else 10000
    n_runs = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    # Optional 4th arg: number of connect/close cycles for the connection-speed test.
    # Pass 0 to skip. Default 30.
    n_connections = int(sys.argv[4]) if len(sys.argv) > 4 else 30

    print(f"=== GAMA Client Performance Benchmark ===")
    print(f"Label: {label}")
    print(f"Version: {get_version()}")
    print(f"Runs: {n_runs} x {iterations} iterations")
    if n_connections > 0:
        print(f"Connection test: {n_connections} connect/close cycles")

    if n_connections > 0:
        conn_runs = []
        for run_idx in range(n_runs):
            if n_runs > 1:
                print(f"\n--- Connection benchmark run {run_idx + 1}/{n_runs} ---")
            else:
                print("\n--- Connection benchmark ---")
            conn_results = await run_connection_benchmark(n_connections, warmup=5, label=label)
            save_results(conn_results)
            conn_runs.append(conn_results)
        if n_runs > 1:
            _print_connection_aggregate(label, conn_runs)

    print("\n--- Step/Expression benchmark ---")
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
