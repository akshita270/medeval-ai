"""USD-per-token pricing for the OpenAI models this project actually calls.

Lives in app/ (not evaluation/) because app/ is what makes the real,
billed calls in production (the live /ask endpoint) -- both its request
logging (app/request_log.py) and evaluation/judge/metrics.py's cost
tracking need the same numbers, so there is exactly one place to update
when OpenAI's pricing changes.
"""

# USD per 1 million tokens, (input, output). Verified against OpenAI's
# published pricing as of this writing -- update if pricing changes, and
# add an entry here before using a new model, rather than guessing.
PRICING_PER_MILLION_TOKENS: dict[str, tuple[float, float]] = {
    "gpt-5-mini": (0.25, 2.00),
    "gpt-4o-mini": (0.15, 0.60),
}


def estimate_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate USD cost for one chat completion call.

    Raises on an unrecognized model rather than silently returning 0 --
    a cost report that's quietly wrong is worse than one that fails loudly.
    """
    if model not in PRICING_PER_MILLION_TOKENS:
        raise ValueError(f"No pricing entry for model '{model}' -- add one to PRICING_PER_MILLION_TOKENS")
    input_price, output_price = PRICING_PER_MILLION_TOKENS[model]
    return (prompt_tokens * input_price + completion_tokens * output_price) / 1_000_000
