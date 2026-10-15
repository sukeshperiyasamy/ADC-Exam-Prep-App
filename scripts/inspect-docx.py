import docx
import re
import json

doc = docx.Document('1.docx')
paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

# Clean smart quotes and weird characters
def clean_text(t):
    return (t.replace('\u2019', "'")
            .replace('\u2018', "'")
            .replace('\u201c', '"')
            .replace('\u201d', '"')
            .replace('\u2013', '-')
            .replace('\u2014', '--')
            .replace('\ufffd', "'")
            .replace('\x92', "'")
            .replace('\x93', '"')
            .replace('\x94', '"')
            .strip())


parsed_scenarios = []
current_scenario = {"title": "", "text": "", "questions": []}
current_q = None

# Regex patterns
scenario_header_re = re.compile(r'^(\d+)\.\s*(.*)', re.DOTALL)
sub_q_re = re.compile(r'^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s*(.*)', re.DOTALL)
correct_re = re.compile(r'^correct\s*answer[:\s]*(.*)', re.IGNORECASE)
explanation_re = re.compile(r'^explanation[:\s]*(.*)', re.IGNORECASE)
option_letter_re = re.compile(r'^[A-D]\.\s+')

i = 0
while i < len(paragraphs):
    raw_line = paragraphs[i]
    line = clean_text(raw_line)
    
    # Check if this line is an Explanation
    exp_match = explanation_re.match(line)
    if exp_match:
        if current_q:
            current_q["explanation"] = exp_match.group(1).strip()
            # If next lines are continuation of explanation
            while i + 1 < len(paragraphs) and not sub_q_re.match(clean_text(paragraphs[i+1])) and not scenario_header_re.match(clean_text(paragraphs[i+1])) and not correct_re.match(clean_text(paragraphs[i+1])):
                next_l = clean_text(paragraphs[i+1])
                if option_letter_re.match(next_l):
                    break
                current_q["explanation"] += " " + next_l
                i += 1
        i += 1
        continue

    # Check if this line is Correct Answer
    corr_match = correct_re.match(line)
    if corr_match:
        if current_q:
            current_q["raw_correct"] = corr_match.group(1).strip()
        i += 1
        continue

    # Check if this line is a Sub-Question (I., II., etc.)
    sub_match = sub_q_re.match(line)
    if sub_match:
        roman = sub_match.group(1)
        q_stem = sub_match.group(2).strip()
        current_q = {
            "roman": roman,
            "stem": q_stem,
            "options": [],
            "raw_correct": "",
            "explanation": ""
        }
        current_scenario["questions"].append(current_q)
        i += 1
        continue

    # Check if this line contains Options (e.g. "A. ... \n B. ...")
    if current_q and (line.startswith('A.') or '\nB.' in line or '\nB ' in line or (line.startswith('A') and len(line) > 2 and line[1] in ('.', ' '))):
        # Could be multi-line in single paragraph or separate lines
        opt_lines = line.split('\n')
        for ol in opt_lines:
            ol = clean_text(ol)
            if ol:
                current_q["options"].append(ol)
        
        # Check if subsequent paragraphs are more options (B., C., D.)
        while i + 1 < len(paragraphs):
            next_l = clean_text(paragraphs[i+1])
            if re.match(r'^[B-D]\.?\s+', next_l):
                for ol in next_l.split('\n'):
                    ol = clean_text(ol)
                    if ol:
                        current_q["options"].append(ol)
                i += 1
            else:
                break
        i += 1
        continue

    # Check if this line is a Scenario Header
    sc_match = scenario_header_re.match(line)
    if sc_match and not option_letter_re.match(line):
        num = sc_match.group(1)
        body = sc_match.group(2).strip()
        if current_scenario["questions"] or current_scenario["text"]:
            parsed_scenarios.append(current_scenario)
        current_scenario = {
            "number": num,
            "title": f"Scenario {num}",
            "text": body,
            "questions": []
        }
        current_q = None
        i += 1
        continue

    # Otherwise if it's general text
    if current_q and not current_q["options"]:
        # Continuation of stem
        current_q["stem"] += " " + line
    elif current_scenario:
        # Continuation of scenario background
        if current_scenario["text"]:
            current_scenario["text"] += " " + line
        else:
            current_scenario["text"] = line

    i += 1

if current_scenario["questions"] or current_scenario["text"]:
    parsed_scenarios.append(current_scenario)

total_scenarios = len(parsed_scenarios)
total_questions = sum(len(s["questions"]) for s in parsed_scenarios)
print(f"Total Scenarios parsed: {total_scenarios}")
print(f"Total Questions parsed: {total_questions}")

# Print first 3 scenarios
for s in parsed_scenarios[:3]:
    print(f"\n=== {s.get('number', '?')}. {s.get('text', '')[:100]}... ===")
    for q in s["questions"]:
        print(f"  [{q['roman']}] Stem: {q['stem'][:70]}")
        print(f"      Options: {len(q['options'])} -> {q['options'][:2]}")
        print(f"      Correct: {q['raw_correct']}")
        if q['explanation']:
            print(f"      Explanation: {q['explanation'][:60]}")

