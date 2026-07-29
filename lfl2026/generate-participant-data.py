#!/usr/bin/env python3
"""Generate participant-data.js from the two allocation sheets in an XLSX file."""

import json
import re
import sys
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS = {"m": MAIN_NS}


def read_shared_strings(archive):
    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    return [
        "".join(node.text or "" for node in item.iterfind(".//m:t", NS))
        for item in root.findall("m:si", NS)
    ]


def cell_value(cell, shared_strings):
    value = cell.find("m:v", NS)
    text = "" if value is None else value.text or ""
    if cell.attrib.get("t") == "s" and text:
        return shared_strings[int(text)]
    if cell.attrib.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.iterfind(".//m:t", NS))
    return text


def session_details(value):
    lines = [line.strip() for line in value.splitlines() if line.strip()]
    title = re.sub(r"^\d+\.\s*", "", lines[0])
    presenter = next(
        (re.sub(r"^Presenters?:\s*", "", line, flags=re.I).strip()
         for line in lines if re.match(r"^Presenters?:", line, flags=re.I)),
        "",
    )
    venue = next(
        (re.sub(r"^Venue:\s*", "", line, flags=re.I).strip()
         for line in lines if re.match(r"^Venue:", line, flags=re.I)),
        "",
    )
    return {"title": title, "presenter": presenter, "venue": venue}


def preferred_name(current, candidate):
    if not current:
        return candidate
    current_lowercase = sum(character.islower() for character in current)
    candidate_lowercase = sum(character.islower() for character in candidate)
    return candidate if candidate_lowercase > current_lowercase else current


def read_participants(workbook):
    participants = {}
    with ZipFile(workbook) as archive:
        shared_strings = read_shared_strings(archive)
        for session_number in (1, 2):
            root = ElementTree.fromstring(
                archive.read(f"xl/worksheets/sheet{session_number}.xml")
            )
            current_session = None
            for row in root.findall(".//m:sheetData/m:row", NS):
                values = {}
                for cell in row.findall("m:c", NS):
                    column = re.match(r"[A-Z]+", cell.attrib["r"]).group()
                    values[column] = cell_value(cell, shared_strings)
                session_cell = (values.get("C") or "").strip()
                if session_cell and not session_cell.lower().startswith("breakout session"):
                    current_session = session_details(session_cell)
                name = (values.get("B") or "").strip()
                if not name or name.casefold() == "name":
                    continue
                key = name.casefold()
                record = participants.setdefault(
                    key, {"name": name, "session1": None, "session2": None}
                )
                record["name"] = preferred_name(record["name"], name)
                record[f"session{session_number}"] = current_session
    return sorted(participants.values(), key=lambda item: item["name"].casefold())


def existing_departments(output_path):
    text = output_path.read_text(encoding="utf-8")
    prefix = "window.LFL_DATA = "
    if not text.startswith(prefix):
        raise ValueError(f"{output_path} is not a recognised participant data file")
    return json.loads(text[len(prefix):].rstrip(";\n"))["departments"]


def main():
    workbook = Path(sys.argv[1] if len(sys.argv) > 1 else "LFL Breakout Allocations_FINAL (Updated).xlsx")
    output = Path(sys.argv[2] if len(sys.argv) > 2 else "participant-data.js")
    payload = {
        "participants": read_participants(workbook),
        "departments": existing_departments(output),
    }
    output.write_text(
        "window.LFL_DATA = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(
        f"Generated {output} from {workbook}: "
        f"{len(payload['participants'])} participants, "
        f"{len(payload['departments'])} departments"
    )


if __name__ == "__main__":
    main()
