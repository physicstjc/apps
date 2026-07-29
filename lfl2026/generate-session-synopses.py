#!/usr/bin/env python3
"""Extract active workshop synopses from the Learning for Life PDF."""

import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader


PDF_TITLES = [
    "Leveraging on the Student Learning Space (SLS) to Enhance Global Literacy",
    "Multimodal Learning for Multi-Faceted Development of e21CC Skills",
    "AI in Mathematics: See the Thinking, Shape the Learning, Spark Joy",
    "Dialogic Talk for Thoughtful Thinkers",
    "AI-ding Students' Preparation for Oral Examinations: Using Technology for Real-World Skills",
    "AI and AA: An Attempt at Amalgamation",
    "The Thinking Partnership: Metacognition Meets AI",
    "Exploring the Use of Non-Linear Pedagogy Principles to Deepen Student Learning in Physical Education",
    "Fostering Student Passion in Project Work Using the From Near to Far Framework",
    "AI as Feedback, Not Fallback: Developing Critical Thinking Using AI",
    "Evidence-Driven Decision-Making: Using Student Data to Complement Teacher Observations",
    "Experimenting with a Pedagogy of Discomfort in the GP Classroom",
    "Empowering Students to Understand Concepts, Not Just Content",
    "Cultivating Self-Directedness, Co-Constructing Success",
    "Redesigning Mathematics Learning: Our ILP Journey and Pedagogical Shifts",
    "AIMS vs Gemini: What AI Feedback Reveals About Student Writing (And What It Might Not)",
    "Use of Brisk Teaching: Practical Strategies to Develop Metacognition and Adaptive Thinking through Formative Assessment",
    "Fostering Critical Thinking and Communication through Real-World Chemistry Projects",
]

CANCELLED_TITLE = "The Thinking Partnership: Metacognition Meets AI"

APP_TITLE_ALIASES = {
    "AI-ding Students' Preparation for Oral Examinations: Using Technology for Real-World Skills":
        "AI-ding Students' Preparation for Oral Examinations: 6. Using Technology for Real-World Skills",
    "Use of Brisk Teaching: Practical Strategies to Develop Metacognition and Adaptive Thinking through Formative Assessment":
        "Use of Brisk Teaching: Practical Strategies to Develop Metacognition and Adaptive Thinking through Form",
}


def normalised_pdf_text(pdf_path):
    text = " ".join(page.extract_text() or "" for page in PdfReader(pdf_path).pages)
    text = re.sub(r"-\s+", "-", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_synopses(pdf_path):
    text = normalised_pdf_text(pdf_path)
    positions = []
    cursor = 0
    for title in PDF_TITLES:
        position = text.find(title, cursor)
        if position < 0:
            raise ValueError(f"Could not find PDF session title: {title}")
        positions.append((position, title))
        cursor = position + len(title)

    synopses = {}
    for index, (position, title) in enumerate(positions):
        if title == CANCELLED_TITLE:
            continue
        start = position + len(title)
        end = positions[index + 1][0] if index + 1 < len(positions) else len(text)
        synopsis = text[start:end]
        synopsis = re.sub(
            r"^\s*Presenters?:.*?Level:\s*(?:IP/JC|IP|JC)\s*",
            "",
            synopsis,
            flags=re.I,
        )
        synopsis = re.sub(
            r"7\. The Thinking Partnership: Metacognition Meets AI "
            r"\(cancelled.*?\)\s*",
            "",
            synopsis,
            flags=re.I,
        )
        synopsis = re.sub(r"\s*(?:BREAKOUT SESSION [AB])\s*", " ", synopsis)
        synopsis = re.sub(r"\s+\d+\.\s*$", "", synopsis).strip()
        synopses[APP_TITLE_ALIASES.get(title, title)] = synopsis
    return synopses


def main():
    pdf_path = Path(sys.argv[1] if len(sys.argv) > 1 else "4 Aug LfL@TJC_synopsis-edited.pdf")
    output_path = Path(sys.argv[2] if len(sys.argv) > 2 else "session-synopses.js")
    synopses = extract_synopses(pdf_path)
    output_path.write_text(
        "window.LFL_SYNOPSES = "
        + json.dumps(synopses, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"Generated {output_path} with {len(synopses)} active workshop synopses")


if __name__ == "__main__":
    main()
