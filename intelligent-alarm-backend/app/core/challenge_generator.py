import random

def generate_math_problem(difficulty: int) -> dict:
    """
    Generates a dynamic math problem based on the requested difficulty (1-5).
    Returns a dictionary with the problem string and the evaluated answer.
    """
    if difficulty == 1:
        # Beginner: Simple Addition / Subtraction (1 - 20)
        a, b = random.randint(1, 20), random.randint(1, 20)
        op = random.choice(['+', '-'])
        # Ensure no negative answers for beginners
        if op == '-' and a < b:
            a, b = b, a
        problem = f"{a} {op} {b}"
        
    elif difficulty == 2:
        # Easy: Larger numbers (10 - 99)
        a, b = random.randint(10, 99), random.randint(10, 99)
        op = random.choice(['+', '-'])
        if op == '-' and a < b:
            a, b = b, a
        problem = f"{a} {op} {b}"
        
    elif difficulty == 3:
        # Medium: Basic Multiplication
        a, b = random.randint(3, 12), random.randint(3, 12)
        problem = f"{a} * {b}"
        
    elif difficulty == 4:
        # Hard: Mixed Operations (A * B + C)
        a, b = random.randint(4, 15), random.randint(4, 15)
        c = random.randint(10, 50)
        problem = f"({a} * {b}) + {c}"
        
    else:
        # Expert: Complex Mixed ( (A * B) - C + D )
        a, b = random.randint(6, 20), random.randint(6, 20)
        c, d = random.randint(10, 100), random.randint(10, 100)
        problem = f"({a} * {b}) - {c} + {d}"

    # Safely evaluate the generated math string
    answer = eval(problem)
    
    return {
        "problem": problem,
        "answer": int(answer)
    }