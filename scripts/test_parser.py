import docx
import re
import json

doc = docx.Document('1.docx')
paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

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

cleaned_lines = [clean_text(p) for p in paragraphs if clean_text(p)]

scenarios = []
current_scenario = {"title": "Introduction", "text": "", "questions": []}
current_q = None

sub_q_re = re.compile(r'^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s*(.*)', re.DOTALL)
scenario_header_re = re.compile(r'^(\d+)\.\s*(.*)', re.DOTALL)
correct_re = re.compile(r'^correct\s*answer[:\s]*(.*)', re.IGNORECASE)
explanation_re = re.compile(r'^explanation[:\s]*(.*)', re.IGNORECASE)
option_letter_re = re.compile(r'^[A-D]\.\s+')

i = 0
while i < len(cleaned_lines):
    line = cleaned_lines[i]
    
    # Check if this line is an Explanation
    exp_m = explanation_re.match(line)
    if exp_m:
        if current_q:
            exp_text = exp_m.group(1).strip()
            current_q["explanation"] = exp_text
            while i + 1 < len(cleaned_lines):
                nxt = cleaned_lines[i+1]
                if (sub_q_re.match(nxt) or scenario_header_re.match(nxt) or 
                    correct_re.match(nxt) or option_letter_re.match(nxt)):
                    break
                current_q["explanation"] += " " + nxt
                i += 1
        i += 1
        continue

    # Check if this line is Correct Answer
    corr_m = correct_re.match(line)
    if corr_m:
        if current_q:
            current_q["raw_correct"] = corr_m.group(1).strip()
        i += 1
        continue

    # Check if this line is a Scenario Number (e.g. 1. , 2. )
    sc_m = scenario_header_re.match(line)
    # Check if it's not an option (e.g., A., B., etc.) and not just a numbered sub-question
    if sc_m and not re.match(r'^[A-D]\.', line):
        num = sc_m.group(1)
        text = sc_m.group(2).strip()
        # Save previous scenario
        if current_scenario["questions"] or current_scenario["text"]:
            scenarios.append(current_scenario)
        current_scenario = {
            "number": num,
            "title": f"Clinical Scenario {num}",
            "text": text,
            "questions": []
        }
        current_q = None
        i += 1
        continue

    # Check if this line is a Sub-Question (I., II., III., etc.)
    sub_m = sub_q_re.match(line)
    if sub_m:
        roman = sub_m.group(1)
        q_stem = sub_m.group(2).strip()
        
        # If this is Roman numeral I and current_scenario already has questions (e.g. up to IV or V),
        # but there was text between them, or it's a new cluster without a number
        if roman == 'I' and current_scenario["questions"]:
            # This is a new scenario without an explicit "X." number header!
            scenarios.append(current_scenario)
            current_scenario = {
                "number": str(len(scenarios) + 1),
                "title": f"Clinical Scenario {len(scenarios) + 1}",
                "text": "",
                "questions": []
            }
        
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

    # Check if line contains Option choices (A. ... B. ...)
    if current_q and (line.startswith('A.') or '\nB.' in line or re.match(r'^[A-D]\.\s+', line)):
        lines_opts = line.split('\n')
        for lo in lines_opts:
            lo = lo.strip()
            if lo:
                current_q["options"].append(lo)
        
        # Also grab subsequent lines if they are B., C., D.
        while i + 1 < len(cleaned_lines):
            nxt = cleaned_lines[i+1]
            if re.match(r'^[B-D]\.?\s+', nxt):
                for lo in nxt.split('\n'):
                    lo = lo.strip()
                    if lo:
                        current_q["options"].append(lo)
                i += 1
            else:
                break
        i += 1
        continue

    # If we get here, it's either continuation of scenario text, or continuation of question stem
    if current_q and not current_q["options"] and not current_q["raw_correct"]:
        current_q["stem"] += " " + line
    elif current_scenario:
        if current_scenario["questions"]:
            # An unnumbered scenario text before the next question I.
            # Create a new scenario!
            scenarios.append(current_scenario)
            current_scenario = {
                "number": str(len(scenarios) + 1),
                "title": f"Clinical Scenario {len(scenarios) + 1}",
                "text": line,
                "questions": []
            }
            current_q = None
        else:
            if current_scenario["text"]:
                current_scenario["text"] += " " + line
            else:
                current_scenario["text"] = line

    i += 1

if current_scenario["questions"] or current_scenario["text"]:
    scenarios.append(current_scenario)

print(f"Total Scenarios parsed: {len(scenarios)}")
total_q = sum(len(s["questions"]) for s in scenarios)
print(f"Total Questions parsed: {total_q}")

# Validate options and correct answers for all questions
missing_opts = 0
missing_correct = 0
for si, s in enumerate(scenarios):
    for qi, q in enumerate(s["questions"]):
        if len(q["options"]) < 2:
            missing_opts += 1
            print(f"Scenario {s.get('number')} Q {q['roman']} has only {len(q['options'])} options: {q['stem'][:50]}")
        if not q["raw_correct"]:
            missing_correct += 1
            print(f"Scenario {s.get('number')} Q {q['roman']} missing correct answer: {q['stem'][:50]}")

print(f"Summary: {missing_opts} questions with < 2 options, {missing_correct} missing correct answer.")
