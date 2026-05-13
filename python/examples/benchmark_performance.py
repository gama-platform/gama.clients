from Documents.GitHub.gama.clients.python.gama_client.message_types import MessageTypes
import asyncio
import time
import json
import os
import sys
from pathlib import Path
from gama_client.sync_client import GamaSyncClient
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
        client.expression(exp_id, "ask people { actions <- [\"aging\", \"playing\", \"eating\", \"sleeping\", \"fighting\", \"working\", \"learning\", \"reading\", \"writing\", \"coding\", \"sleeping\", \"eating\", \"playing\", \"fighting\", \"working\", \"learning\", \"reading\", \"writing\", \"coding\"];}")

    print(f"Starting benchmark with {iterations} iterations...")
    
    # We measure: 
    # 1. Step time (GAMA execution)
    # 2. Reading expression time (Data transfer + Parsing)
    # 3. Writing expression time (Data transfer + Parsing)
    # This is a common scenario for gama-client
    
    step_times = []
    expr_times = []
    expr2_times = []
    
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
        
        t4 = time.perf_counter()
        expr_res2 = client.expression(exp_id, "ask people { actions <- [\"aging\", \"playing\", \"eating\", \"sleeping\", \"fighting\", \"working\", \"learning\", \"reading\", \"writing\", \"coding\", \"sleeping\", \"eating\", \"playing\", \"fighting\", \"working\", \"learning\", \"reading\", \"writing\", \"coding\"];}")
        t5 = time.perf_counter()
        expr2_times.append(t5 - t4)
        
        if not expr_res2.get("type") == MessageTypes.CommandExecutedSuccessfully.value:
             print(f"Warning: couldn't assign actions in iteration {i}")



    end_total = time.perf_counter()
    
    total_duration = end_total - start_total
    avg_step = sum(step_times) / len(step_times)
    avg_expr = sum(expr_times) / len(expr_times)
    avg_expr2 = sum(expr2_times) / len(expr2_times)
    
    print(f"\nBenchmark Finished!")
    print(f"Total duration: {total_duration:.4f}s")
    print(f"Avg Step time:  {avg_step*1000:.2f}ms")
    print(f"Avg Expr time:  {avg_expr*1000:.2f}ms (First payload parsing)")
    print(f"Avg Expr2 time: {avg_expr2*1000:.2f}ms (Second payload parsing)")
    
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
        "avg_expr2_ms": avg_expr2 * 1000,
        "step_times": step_times,
        "expr_times": expr_times,
        "expr2_times": expr2_times
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

async def main():
    label = sys.argv[1] if len(sys.argv) > 1 else "baseline"
    iterations = int(sys.argv[2]) if len(sys.argv) > 2 else 10000
    
    print(f"=== GAMA Client Performance Benchmark ===")
    print(f"Label: {label}")
    print(f"Version: {get_version()}")
    
    results = await run_benchmark(iterations, label)
    save_results(results)

if __name__ == "__main__":
    asyncio.run(main())
