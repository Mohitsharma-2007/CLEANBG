#!/usr/bin/env python3
"""
WPR Generator - Week Update Utility
Usage:
  python update_week.py --week 2 --target "Build Attendance Tracking System" \
    --tasks-json '[{"day":"Day 1 – 07/09/2026","task":"Design DB schema"},{"day":"Day 2 – 08/09/2026","task":"API setup"}]' \
    --learning "Learned FastAPI and SQLite" \
    --future-plan "Integrate QR code scanner" \
    --live-url "https://attendx.vercel.app" \
    --github-url "https://github.com/Mohitsharma-2007/ATTENDX"
"""

import argparse
import json
import os
import sys

def main():
    parser = argparse.ArgumentParser(description="Update specific week in WPR data JSON and default-data.js")
    parser.add_argument("--week", type=int, required=True, help="Week number (1 to 6)")
    parser.add_argument("--target", type=str, help="Target of the week")
    parser.add_argument("--tasks-json", type=str, help="JSON array string of tasks: [{\"day\": \"...\", \"task\": \"...\"}]")
    parser.add_argument("--learning", type=str, help="Learning outcomes")
    parser.add_argument("--future-plan", type=str, help="Future work plan")
    parser.add_argument("--live-url", type=str, help="Live deployment URL")
    parser.add_argument("--github-url", type=str, help="GitHub repository URL")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "wpr_data.json")
    default_js_path = os.path.join(script_dir, "default-data.js")

    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found!")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    week_idx = args.week - 1
    if week_idx < 0 or week_idx >= len(data["reports"]):
        print(f"Error: Week number must be between 1 and {len(data['reports'])}")
        sys.exit(1)

    report = data["reports"][week_idx]

    if args.target is not None:
        report["targetOfTheWeek"] = args.target
    if args.tasks_json is not None:
        try:
            tasks = json.loads(args.tasks_json)
            if isinstance(tasks, list):
                report["tasks"] = tasks
        except Exception as e:
            print(f"Warning: Failed to parse tasks-json: {e}")
    if args.learning is not None:
        report["learningOutcomes"] = args.learning
    if args.future_plan is not None:
        report["futureWorkPlan"] = args.future_plan
    if getattr(args, "live_url", None) is not None:
        report["projectUrl"] = args.live_url
    if getattr(args, "github_url", None) is not None:
        report["githubUrl"] = args.github_url

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    with open(default_js_path, "w", encoding="utf-8") as f:
        f.write("window.DEFAULT_WPR_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")

    print(f"Successfully updated Week {args.week:02d} in wpr_data.json and default-data.js!")

if __name__ == "__main__":
    main()
