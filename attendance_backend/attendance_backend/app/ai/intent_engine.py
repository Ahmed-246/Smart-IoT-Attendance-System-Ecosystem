import re
import difflib
import random

def normalize(text: str) -> str:
    """Lowercase, strip punctuation, expand common abbreviations."""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)  # remove punctuation
    # Expand simple abbreviations
    abbrevs = {
        "im": "i am",
        "whats": "what is",
        "cant": "cannot",
        "wont": "will not",
        "dont": "do not",
        "idk": "i do not know",
        "pls": "please",
        "plz": "please"
    }
    words = text.split()
    expanded = [abbrevs.get(w, w) for w in words]
    return " ".join(expanded)

def fuzzy_match(word: str, candidates: list[str], cutoff: float = 0.7) -> bool:
    """Return True if word closely matches any candidate using difflib."""
    matches = difflib.get_close_matches(word, candidates, n=1, cutoff=cutoff)
    return len(matches) > 0

def resolve_intent(question: str, role_intents: dict) -> tuple[str, float]:
    """
    Given a question and a role's intent registry, return (best_intent, confidence).
    Confidence is a naive score based on keyword/synonym match density.
    Supports multi-word keywords by checking for their presence in the full normalized text.
    """
    normalized_q = normalize(question)
    words = normalized_q.split()
    
    if not words:
        return "unknown", 0.0

    # 1. Check for EXACT or close matches in confirm_phrases, follow_ups, or keywords
    # This ensures that if the user clicks a suggestion, it ALWAYS works.
    for intent_name, intent_data in role_intents.items():
        confirm = normalize(intent_data.get("confirm_phrase", ""))
        if confirm and (confirm in normalized_q or normalized_q in confirm):
            return intent_name, 1.0
        
        
        for kw in intent_data.get("keywords", []):
            kw_norm = normalize(kw)
            # 1.0 Confidence only for exact matches or long phrases within the question
            if kw_norm:
                if kw_norm == normalized_q:
                    return intent_name, 1.0
                if len(kw_norm.split()) > 1 and kw_norm in normalized_q:
                    return intent_name, 1.0

    best_intent = "unknown"
    highest_score = 0.0

    for intent_name, intent_data in role_intents.items():
        keywords = intent_data.get("keywords", [])
        synonyms = intent_data.get("synonyms", {})
        
        match_count = 0
        
        # Check for multi-word keywords first (phrases)
        for kw in keywords:
            if " " in kw:
                if kw in normalized_q:
                    # Give higher weight to phrase matches
                    match_count += (len(kw.split()) * 1.5)
        
        # Check single words
        for word in words:
            if word in keywords:
                match_count += 1
            elif word in synonyms:
                match_count += 1
            elif fuzzy_match(word, keywords, cutoff=0.7):
                match_count += 0.9
            else:
                # Check for substring match (e.g. "attend" in "attendance")
                for kw in keywords:
                    if len(word) > 3 and (word in kw or kw in word):
                        match_count += 0.7
                        break
                
        # Simple scoring
        if match_count > 0:
            divisor = max(len(words), 2)
            base_score = min(1.0, match_count / divisor)
            
            # Boost for phrase matches
            if any(" " in kw and kw in normalized_q for kw in keywords):
                base_score = min(1.0, base_score + 0.3)
                
            if base_score > highest_score:
                highest_score = base_score
                best_intent = intent_name

    return best_intent, highest_score

def suggest_intents(question: str, role_intents: dict, n: int = 2) -> list[str]:
    """
    Returns 'confirm_phrase' for the top N intents if confidence is low.
    Ensures that suggestions are strictly derived from the intent registry.
    """
    normalized_q = normalize(question)
    words = normalized_q.split()
    
    scores = []
    for intent_name, intent_data in role_intents.items():
        # Social intents are less likely to be "suggested" unless specifically asked
        if intent_name in ["greeting", "well_being", "identity"]: continue
            
        keywords = intent_data.get("keywords", [])
        synonyms = intent_data.get("synonyms", {})
        all_terms = list(keywords)
        match_count = 0
        for word in words:
            if word in all_terms or word in synonyms or fuzzy_match(word, all_terms, cutoff=0.7):
                match_count += 1
        
        if match_count > 0:
            scores.append((match_count, intent_name, intent_data))
            
    # Sort by matches desc
    scores.sort(key=lambda x: x[0], reverse=True)
    
    suggestions = []
    for score in scores[:n]:
        intent_data = score[2]
        if "confirm_phrase" in intent_data:
            suggestions.append(f"Did you mean: {intent_data['confirm_phrase']}?")
            
    # If no decent partial matches, return the most common/helpful intents for that role
    if not suggestions:
        # Default helpful intents per role
        help_topics = []
        for name, data in role_intents.items():
            if name in ["system_status", "attendance_overview", "my_attendance", "my_courses", "help"]:
                help_topics.append(data.get("confirm_phrase", "general assistance"))
        
        for topic in help_topics[:n]:
            suggestions.append(f"Did you mean: {topic}?")
        
    return suggestions
