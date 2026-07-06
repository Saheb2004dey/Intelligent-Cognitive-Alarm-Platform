import random
from app.core.logic_engines import (
    generate_memory_sequence,
    generate_pattern_recognition,
    generate_logic_puzzle
)

def generate_math_problem(difficulty: int) -> dict:
    """Baseline math engine updated to match the new universal JSON contract."""
    difficulty = max(1, min(5, difficulty))
    
    if difficulty == 1:
        a, b = random.randint(1, 9), random.randint(1, 9)
        op = random.choice(["+", "-"])
        if op == "-" and a < b:
            a, b = b, a
        problem = f"{a} {op} {b}"
        answer = str(a + b if op == "+" else a - b)
    else:
        # Simplified scaling for the router example
        a, b = random.randint(10, 50 * difficulty), random.randint(1, 10 * difficulty)
        problem = f"{a} + {b}"
        answer = str(a + b)
        
    return {
        "client_payload": {
            "challenge_type": "math",
            "difficulty": difficulty,
            "content": {
                "prompt": f"Solve this: {problem}"
            }
        },
        "server_answer": answer
    }

def get_next_challenge(difficulty: int, challenge_type: str = "random") -> dict:
    """
    Acts as the master router. Routes the request to the correct engine
    based on the requested challenge type.
    """
    engines = {
        "math": generate_math_problem,
        "memory": generate_memory_sequence,
        "pattern": generate_pattern_recognition,
        "logic": generate_logic_puzzle
    }
    
    if challenge_type == "random" or challenge_type not in engines:
        challenge_type = random.choice(list(engines.keys()))
        
    engine_function = engines[challenge_type]
    return engine_function(difficulty)