"""
Quantitative writing style analysis for prose and code.

Computes ~80 features per submission that form a stylometric fingerprint.
No LLM calls — pure Python computation.
"""

import re
import math
from collections import Counter


# ── Top 50 English function words (stable across all stylometry literature) ──
FUNCTION_WORDS = [
    "the", "of", "and", "a", "to", "in", "is", "that", "it", "for",
    "was", "on", "are", "as", "with", "his", "they", "be", "at", "one",
    "have", "this", "from", "by", "but", "not", "what", "all", "were", "we",
    "when", "your", "can", "had", "i", "each", "which", "she", "do", "how",
    "their", "if", "will", "other", "about", "up", "out", "then", "them", "these",
]

# Common 3000 words list (top ~200 as a proxy — keeps the module light)
# In practice, words NOT in this set indicate advanced vocabulary
COMMON_WORDS = {
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
    "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
    "people", "into", "year", "your", "good", "some", "could", "them", "see",
    "other", "than", "then", "now", "look", "only", "come", "its", "over",
    "think", "also", "back", "after", "use", "two", "how", "our", "work",
    "first", "well", "way", "even", "new", "want", "because", "any", "these",
    "give", "day", "most", "us", "is", "are", "was", "were", "been", "has",
    "had", "did", "got", "made", "said", "went", "came", "took", "told",
    "very", "much", "more", "still", "here", "where", "while", "should",
    "each", "may", "does", "long", "too", "right", "down", "must", "need",
    "such", "never", "own", "part", "thing", "place", "every", "same",
    "another", "through", "great", "before", "between", "might", "being",
    "few", "those", "always", "show", "start", "many", "small", "really",
    "something", "often", "found", "help", "both", "end", "around", "home",
    "large", "old", "life", "since", "off", "big", "high", "last", "keep",
    "tell", "why", "let", "put", "hand", "point", "turn", "set", "ask",
}

# Code file extensions for detection
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c", ".h",
    ".cs", ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".scala",
    ".r", ".m", ".sql", ".sh", ".bash", ".html", ".css",
}

# Comment patterns for various languages
COMMENT_PATTERNS = {
    "single_line": re.compile(r"^\s*(//|#|--)\s*", re.MULTILINE),
    "block_start": re.compile(r"/\*"),
    "block_end": re.compile(r"\*/"),
    "docstring": re.compile(r'""".*?"""|\'\'\'.*?\'\'\'', re.DOTALL),
}

# Identifier extraction (variable/function names)
IDENTIFIER_RE = re.compile(r"\b[a-zA-Z_][a-zA-Z0-9_]*\b")

# Keywords to exclude from identifier analysis
KEYWORDS = {
    "if", "else", "elif", "for", "while", "do", "switch", "case", "break",
    "continue", "return", "def", "class", "import", "from", "as", "try",
    "except", "finally", "raise", "with", "yield", "lambda", "pass", "assert",
    "global", "nonlocal", "del", "print", "true", "false", "none", "null",
    "var", "let", "const", "function", "new", "this", "self", "static",
    "public", "private", "protected", "void", "int", "float", "double",
    "string", "bool", "boolean", "char", "long", "short", "unsigned",
    "struct", "enum", "interface", "extends", "implements", "abstract",
    "override", "virtual", "async", "await", "export", "default", "type",
    "namespace", "package", "throw", "throws", "catch", "instanceof", "typeof",
    "and", "or", "not", "in", "is", "the", "of", "to", "a", "an",
}


def _tokenize_sentences(text: str) -> list[str]:
    """Simple sentence tokenizer — splits on . ! ? followed by space/newline."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 5]


def _tokenize_words(text: str) -> list[str]:
    """Lowercase word tokenizer."""
    return re.findall(r"[a-z']+", text.lower())


def _is_code(text: str, file_type: str = "") -> bool:
    """Heuristic: is this submission code?"""
    if file_type and any(ext in file_type.lower() for ext in CODE_EXTENSIONS):
        return True
    code_indicators = [
        r"def\s+\w+\s*\(", r"function\s+\w+\s*\(", r"class\s+\w+",
        r"import\s+\w+", r"#include\s*<", r"public\s+static\s+void",
        r"console\.log", r"System\.out", r"print\s*\(",
    ]
    matches = sum(1 for p in code_indicators if re.search(p, text))
    lines = text.strip().split("\n")
    brace_lines = sum(1 for l in lines if "{" in l or "}" in l)
    if matches >= 2 or brace_lines > len(lines) * 0.1:
        return True
    return False


# ═══════════════════════════════════════════════════════════════════
# PROSE METRICS
# ═══════════════════════════════════════════════════════════════════

def _lexical_metrics(words: list[str]) -> dict:
    """Vocabulary richness metrics."""
    if not words:
        return {
            "type_token_ratio": 0, "hapax_ratio": 0, "yules_k": 0,
            "avg_word_length": 0, "word_length_dist": [0] * 15,
            "advanced_vocab_ratio": 0,
        }

    total = len(words)
    freq = Counter(words)
    unique = len(freq)

    # Type-token ratio (on first 1000 tokens for length independence)
    sample = words[:1000]
    ttr = len(set(sample)) / len(sample) if sample else 0

    # Hapax legomena ratio
    hapax = sum(1 for w, c in freq.items() if c == 1)
    hapax_ratio = hapax / unique if unique else 0

    # Yule's K (length-independent vocabulary richness)
    freq_spectrum = Counter(freq.values())
    m1 = total
    m2 = sum(i * i * v for i, v in freq_spectrum.items())
    yules_k = 10000 * (m2 - m1) / (m1 * m1) if m1 > 0 else 0

    # Word length distribution (1-15+ chars)
    wl_counts = [0] * 15
    for w in words:
        idx = min(len(w), 15) - 1
        wl_counts[idx] += 1
    wl_dist = [c / total for c in wl_counts]

    # Advanced vocabulary ratio
    advanced = sum(1 for w in words if w not in COMMON_WORDS)
    adv_ratio = advanced / total if total else 0

    return {
        "type_token_ratio": round(ttr, 4),
        "hapax_ratio": round(hapax_ratio, 4),
        "yules_k": round(yules_k, 4),
        "avg_word_length": round(sum(len(w) for w in words) / total, 4),
        "word_length_dist": [round(x, 4) for x in wl_dist],
        "advanced_vocab_ratio": round(adv_ratio, 4),
    }


def _sentence_metrics(sentences: list[str]) -> dict:
    """Sentence structure metrics."""
    if not sentences:
        return {
            "mean_sentence_length": 0, "sentence_length_std": 0,
            "sentence_length_dist": [0] * 5,
            "question_ratio": 0, "exclamation_ratio": 0,
        }

    lengths = [len(s.split()) for s in sentences]
    total = len(sentences)
    mean_len = sum(lengths) / total
    variance = sum((l - mean_len) ** 2 for l in lengths) / total if total > 1 else 0
    std = math.sqrt(variance)

    # Distribution buckets: 0-10, 11-20, 21-30, 31-40, 41+
    buckets = [0] * 5
    for l in lengths:
        idx = min(l // 10, 4) if l > 0 else 0
        buckets[idx] += 1
    dist = [b / total for b in buckets]

    questions = sum(1 for s in sentences if s.strip().endswith("?"))
    exclamations = sum(1 for s in sentences if s.strip().endswith("!"))

    return {
        "mean_sentence_length": round(mean_len, 4),
        "sentence_length_std": round(std, 4),
        "sentence_length_dist": [round(x, 4) for x in dist],
        "question_ratio": round(questions / total, 4),
        "exclamation_ratio": round(exclamations / total, 4),
    }


def _punctuation_metrics(text: str) -> dict:
    """Punctuation frequency per 1000 words."""
    words = text.split()
    total = len(words) if words else 1
    scale = 1000 / total

    return {
        "comma_per_1000": round(text.count(",") * scale, 4),
        "semicolon_per_1000": round(text.count(";") * scale, 4),
        "colon_per_1000": round(text.count(":") * scale, 4),
        "em_dash_per_1000": round((text.count("—") + text.count("--")) * scale, 4),
        "parentheses_per_1000": round((text.count("(") + text.count(")")) * scale, 4),
        "quote_per_1000": round((text.count('"') + text.count('"') + text.count('"')) * scale, 4),
        "ellipsis_per_1000": round((text.count("...") + text.count("…")) * scale, 4),
    }


def _function_word_frequencies(words: list[str]) -> list[float]:
    """Frequency of top 50 function words per 1000 words."""
    total = len(words) if words else 1
    freq = Counter(words)
    scale = 1000 / total
    return [round(freq.get(fw, 0) * scale, 4) for fw in FUNCTION_WORDS]


def _readability_metrics(text: str, words: list[str], sentences: list[str]) -> dict:
    """Flesch-Kincaid Grade Level and Automated Readability Index."""
    if not words or not sentences:
        return {"flesch_kincaid": 0, "ari": 0}

    total_words = len(words)
    total_sentences = len(sentences)
    total_chars = sum(len(w) for w in words)

    # Syllable approximation (vowel groups)
    def syllables(word):
        word = word.lower()
        count = len(re.findall(r'[aeiouy]+', word))
        if word.endswith('e'):
            count -= 1
        return max(count, 1)

    total_syllables = sum(syllables(w) for w in words)

    # Flesch-Kincaid Grade Level
    fk = (0.39 * (total_words / total_sentences) +
          11.8 * (total_syllables / total_words) - 15.59) if total_sentences else 0

    # Automated Readability Index
    ari = (4.71 * (total_chars / total_words) +
           0.5 * (total_words / total_sentences) - 21.43) if total_sentences else 0

    return {
        "flesch_kincaid": round(fk, 4),
        "ari": round(ari, 4),
    }


def _paragraph_metrics(text: str, sentences: list[str]) -> dict:
    """Paragraph and document structure."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text]

    para_sentence_counts = []
    for p in paragraphs:
        p_sents = _tokenize_sentences(p)
        para_sentence_counts.append(len(p_sents))

    has_bullets = bool(re.search(r"^\s*[-*•]\s", text, re.MULTILINE))
    has_numbered = bool(re.search(r"^\s*\d+[.)]\s", text, re.MULTILINE))
    bullet_count = len(re.findall(r"^\s*[-*•]\s", text, re.MULTILINE))
    has_headings = bool(re.search(r"^#{1,6}\s|^[A-Z][A-Za-z\s]+:$", text, re.MULTILINE))

    mean_para = sum(para_sentence_counts) / len(para_sentence_counts) if para_sentence_counts else 0

    return {
        "paragraph_count": len(paragraphs),
        "mean_paragraph_length": round(mean_para, 4),
        "uses_bullets": has_bullets or has_numbered,
        "bullet_count": bullet_count,
        "uses_headings": has_headings,
    }


# ═══════════════════════════════════════════════════════════════════
# CODE METRICS
# ═══════════════════════════════════════════════════════════════════

def _code_metrics(text: str) -> dict:
    """Code-specific style metrics."""
    lines = text.split("\n")
    total_lines = len(lines)
    if total_lines == 0:
        return _empty_code_metrics()

    non_empty_lines = [l for l in lines if l.strip()]
    blank_lines = total_lines - len(non_empty_lines)

    # Comment density
    comment_lines = 0
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(("//", "#", "--", "/*", "*/", "*")):
            comment_lines += 1
    # Count docstrings
    docstring_matches = COMMENT_PATTERNS["docstring"].findall(text)
    for ds in docstring_matches:
        comment_lines += ds.count("\n") + 1

    # Line lengths
    line_lengths = [len(l) for l in non_empty_lines]
    avg_line_length = sum(line_lengths) / len(line_lengths) if line_lengths else 0
    line_length_std = math.sqrt(
        sum((l - avg_line_length) ** 2 for l in line_lengths) / len(line_lengths)
    ) if len(line_lengths) > 1 else 0

    # Identifier analysis
    all_identifiers = IDENTIFIER_RE.findall(text)
    identifiers = [w for w in all_identifiers if w.lower() not in KEYWORDS and len(w) > 1]
    avg_identifier_length = (
        sum(len(i) for i in identifiers) / len(identifiers) if identifiers else 0
    )

    # Naming convention detection
    snake_count = sum(1 for i in identifiers if "_" in i and i == i.lower())
    camel_count = sum(1 for i in identifiers if re.match(r"^[a-z][a-zA-Z0-9]*$", i) and any(c.isupper() for c in i))
    pascal_count = sum(1 for i in identifiers if re.match(r"^[A-Z][a-zA-Z0-9]*$", i) and len(i) > 1)
    total_named = snake_count + camel_count + pascal_count or 1

    # Indentation analysis
    indent_spaces = 0
    indent_tabs = 0
    indent_sizes = []
    for line in non_empty_lines:
        leading = len(line) - len(line.lstrip())
        if leading > 0:
            if line[0] == "\t":
                indent_tabs += 1
            else:
                indent_spaces += 1
                indent_sizes.append(leading)

    common_indent = 4  # default
    if indent_sizes:
        # Find most common indent increment
        increments = Counter()
        for s in indent_sizes:
            for divisor in [2, 3, 4, 8]:
                if s % divisor == 0:
                    increments[divisor] += 1
        if increments:
            common_indent = increments.most_common(1)[0][0]

    # Function/method length estimation
    func_starts = [i for i, l in enumerate(lines)
                   if re.match(r"\s*(def |function |public |private |protected |static |async )", l)]
    func_lengths = []
    for j, start in enumerate(func_starts):
        end = func_starts[j + 1] if j + 1 < len(func_starts) else total_lines
        func_lengths.append(end - start)
    avg_func_length = sum(func_lengths) / len(func_lengths) if func_lengths else 0

    return {
        "comment_density": round(comment_lines / total_lines, 4) if total_lines else 0,
        "avg_line_length": round(avg_line_length, 4),
        "line_length_std": round(line_length_std, 4),
        "blank_line_ratio": round(blank_lines / total_lines, 4),
        "avg_identifier_length": round(avg_identifier_length, 4),
        "snake_case_ratio": round(snake_count / total_named, 4),
        "camel_case_ratio": round(camel_count / total_named, 4),
        "pascal_case_ratio": round(pascal_count / total_named, 4),
        "uses_tabs": indent_tabs > indent_spaces,
        "indent_size": common_indent,
        "avg_function_length": round(avg_func_length, 4),
        "function_count": len(func_starts),
    }


def _empty_code_metrics() -> dict:
    return {
        "comment_density": 0, "avg_line_length": 0, "line_length_std": 0,
        "blank_line_ratio": 0, "avg_identifier_length": 0,
        "snake_case_ratio": 0, "camel_case_ratio": 0, "pascal_case_ratio": 0,
        "uses_tabs": False, "indent_size": 4, "avg_function_length": 0,
        "function_count": 0,
    }


# ═══════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════

def analyze_style(text: str, file_type: str = "") -> dict:
    """Compute full quantitative style fingerprint for a submission.

    Returns a dict with keys: content_type, lexical, sentence, punctuation,
    function_words, readability, paragraph, code (if applicable).
    """
    is_code_submission = _is_code(text, file_type)

    result = {"content_type": "code" if is_code_submission else "prose"}

    if is_code_submission:
        # For code: compute code metrics + basic prose metrics on comments/docstrings
        result["code"] = _code_metrics(text)

        # Extract comments and docstrings for prose analysis
        comment_text = _extract_comment_text(text)
        if len(comment_text.split()) > 30:
            words = _tokenize_words(comment_text)
            sentences = _tokenize_sentences(comment_text)
            result["lexical"] = _lexical_metrics(words)
            result["sentence"] = _sentence_metrics(sentences)
            result["punctuation"] = _punctuation_metrics(comment_text)
            result["function_words"] = _function_word_frequencies(words)
            result["readability"] = _readability_metrics(comment_text, words, sentences)
        else:
            # Not enough comment text — use the full text for basic prose metrics
            words = _tokenize_words(text)
            sentences = _tokenize_sentences(text)
            result["lexical"] = _lexical_metrics(words)
            result["sentence"] = _sentence_metrics(sentences)
            result["punctuation"] = _punctuation_metrics(text)
            result["function_words"] = _function_word_frequencies(words)
            result["readability"] = _readability_metrics(text, words, sentences)
    else:
        # Pure prose analysis
        words = _tokenize_words(text)
        sentences = _tokenize_sentences(text)
        result["lexical"] = _lexical_metrics(words)
        result["sentence"] = _sentence_metrics(sentences)
        result["punctuation"] = _punctuation_metrics(text)
        result["function_words"] = _function_word_frequencies(words)
        result["readability"] = _readability_metrics(text, words, sentences)
        result["paragraph"] = _paragraph_metrics(text, sentences)

    return result


def _extract_comment_text(code: str) -> str:
    """Extract human-written text from code (comments + docstrings)."""
    parts = []

    # Single-line comments
    for match in re.finditer(r"(?:^|\s)(?://|#)\s*(.*?)$", code, re.MULTILINE):
        parts.append(match.group(1))

    # Docstrings
    for match in re.finditer(r'"""(.*?)"""|\'\'\'(.*?)\'\'\'', code, re.DOTALL):
        parts.append(match.group(1) or match.group(2))

    # Block comments
    for match in re.finditer(r"/\*(.*?)\*/", code, re.DOTALL):
        # Clean up leading * on each line
        block = match.group(1)
        lines = [re.sub(r"^\s*\*\s?", "", l) for l in block.split("\n")]
        parts.append(" ".join(lines))

    return " ".join(parts)


def get_scalar_metrics(style_data: dict) -> dict[str, float]:
    """Flatten the nested style dict into a flat dict of scalar metric_name -> value.

    Used by style_store for Welford's algorithm updates.
    Skips non-numeric fields and vectors (function_words, distributions).
    """
    flat = {}

    for section in ["lexical", "sentence", "punctuation", "readability", "paragraph", "code"]:
        data = style_data.get(section, {})
        for key, val in data.items():
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                flat[f"{section}.{key}"] = float(val)

    return flat


def get_vector_metrics(style_data: dict) -> dict[str, list[float]]:
    """Extract vector-valued metrics (function words, distributions)."""
    vectors = {}

    if "function_words" in style_data:
        vectors["function_words"] = style_data["function_words"]

    if "lexical" in style_data and "word_length_dist" in style_data["lexical"]:
        vectors["word_length_dist"] = style_data["lexical"]["word_length_dist"]

    if "sentence" in style_data and "sentence_length_dist" in style_data["sentence"]:
        vectors["sentence_length_dist"] = style_data["sentence"]["sentence_length_dist"]

    return vectors
