import re


def clean_text(text: str) -> str:
    """
    Clean raw Wikipedia text:
    - Remove citation markers like [1], [2]
    - Remove lines that are just section headers (e.g., == See also ==)
    - Collapse multiple blank lines into one
    - Strip leading/trailing whitespace
    """
    # Remove citation/reference markers like [1], [note 2]
    text = re.sub(r"\[\d+\]", "", text)
    text = re.sub(r"\[note \d+\]", "", text)

    # Remove Wikipedia-style section headers (== Header ==)
    text = re.sub(r"={2,}.*?={2,}", "", text)

    # Collapse multiple newlines into a max of two
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Strip leading/trailing whitespace
    text = text.strip()

    return text
