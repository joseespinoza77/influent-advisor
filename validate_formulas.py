"""
Validate the migrated formula model against cached values extracted from Excel.

This script does not execute Excel, VBA, COM, or macros. It uses the JSON files
bundled with the web app and checks that the standalone evaluator reproduces
the cached workbook outputs for the default input values.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
CELLS_PATH = BASE_DIR / "data" / "cells.json"


class FormulaError(Exception):
    pass


class FormulaEvaluator:
    def __init__(self, sheet_cells: dict[str, dict]):
        self.sheet_cells = {self.normalize_ref(k): v for k, v in sheet_cells.items()}
        self.computed: dict[str, object] = {}
        self.computing: set[str] = set()

    @staticmethod
    def normalize_ref(ref: str) -> str:
        return str(ref or "").replace("$", "").upper()

    @staticmethod
    def _cell_sort_key(ref: str) -> tuple[int, str]:
        match = re.match(r"^([A-Z]+)(\d+)$", FormulaEvaluator.normalize_ref(ref))
        if not match:
            return (10**9, ref)
        return (int(match.group(2)), match.group(1))

    def get_cell_value(self, ref: str):
        ref = self.normalize_ref(ref)
        if ref in self.computed:
            return self.computed[ref]

        cell = self.sheet_cells.get(ref)
        if not cell:
            self.computed[ref] = 0
            return 0

        if cell.get("type") == "constant":
            value = cell.get("value", 0)
            self.computed[ref] = value
            return value

        if cell.get("type") == "formula":
            if ref in self.computing:
                raise FormulaError(f"circular reference at {ref}")
            self.computing.add(ref)
            try:
                value = self.evaluate(cell.get("formula", ""))
                self.computed[ref] = value
                return value
            finally:
                self.computing.remove(ref)

        self.computed[ref] = 0
        return 0

    def compute_all(self):
        refs = [
            ref for ref, cell in self.sheet_cells.items()
            if cell.get("type") == "formula"
        ]
        for ref in sorted(refs, key=self._cell_sort_key):
            self.get_cell_value(ref)
        return self.computed

    def evaluate(self, formula: str):
        expr = str(formula or "").strip()
        if expr.startswith("="):
            expr = expr[1:]
        if expr == "":
            return 0
        if re.fullmatch(r"-?\d+(\.\d+)?", expr):
            return float(expr) if "." in expr else int(expr)
        if expr in {'"t"', "'t'"}:
            return "t"
        if expr in {'"f"', "'f'"}:
            return "f"

        resolved = self._resolve_refs(expr)
        converted = self._convert_if_to_python(resolved)
        converted = self._fix_comparison_ops(converted)
        converted = converted.replace("&", "+")

        try:
            result = eval(converted, {"__builtins__": {}}, {})
        except ZeroDivisionError:
            return "#DIV/0!"
        except Exception as exc:
            raise FormulaError(f"{formula} -> {converted}: {exc}") from exc

        if isinstance(result, bool):
            return "t" if result else "f"
        if isinstance(result, (int, float)):
            if not math.isfinite(result):
                return "#DIV/0!"
            return 0 if result == 0 else result
        return result if result is not None else 0

    def _resolve_refs(self, expr: str) -> str:
        def replace(match: re.Match) -> str:
            col, row = match.group(1), match.group(2)
            value = self.get_cell_value(f"{col}{row}")
            if value is None or value == "":
                return "0"
            return repr(value) if isinstance(value, str) else f"({value})"

        return re.sub(r"\$?([A-Z]+)\$?(\d+)", replace, expr)

    def _convert_if_to_python(self, expr: str) -> str:
        result = ""
        index = 0
        while index < len(expr):
            if_pos = expr.find("IF(", index)
            if if_pos == -1:
                result += expr[index:]
                break

            result += expr[index:if_pos]
            args, end = self._parse_if_args(expr, if_pos + 2)
            if len(args) == 3:
                cond = self._convert_if_to_python(args[0])
                true_value = self._convert_if_to_python(args[1])
                false_value = self._convert_if_to_python(args[2])
                result += f"(({true_value}) if ({cond}) else ({false_value}))"
            elif len(args) == 2:
                cond = self._convert_if_to_python(args[0])
                true_value = self._convert_if_to_python(args[1])
                result += f"(({true_value}) if ({cond}) else (0))"
            else:
                result += expr[if_pos:end]
            index = end
        return result

    @staticmethod
    def _parse_if_args(expr: str, open_paren_index: int):
        args: list[str] = []
        depth = 0
        current: list[str] = []

        for index in range(open_paren_index, len(expr)):
            char = expr[index]
            if char == "(":
                depth += 1
                if depth > 1:
                    current.append(char)
            elif char == ")":
                depth -= 1
                if depth == 0:
                    args.append("".join(current).strip())
                    return args, index + 1
                current.append(char)
            elif char == "," and depth == 1:
                args.append("".join(current).strip())
                current = []
            else:
                current.append(char)

        if current:
            args.append("".join(current).strip())
        return args, len(expr)

    @staticmethod
    def _fix_comparison_ops(expr: str) -> str:
        expr = expr.replace("<>", "!=")
        return re.sub(r"(?<![!<>=])=(?!=)", "==", expr)


def values_match(actual, expected, tolerance: float) -> bool:
    if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        return abs(float(actual) - float(expected)) <= tolerance
    return actual == expected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-errors", type=int, default=25)
    parser.add_argument("--tolerance", type=float, default=1e-9)
    args = parser.parse_args()

    with CELLS_PATH.open("r", encoding="utf-8") as handle:
        all_cells = json.load(handle)

    formulas_checked = 0
    mismatches: list[tuple[str, str, object, object, str]] = []
    errors: list[tuple[str, str, str]] = []

    for sheet_name, sheet_cells in all_cells.items():
        evaluator = FormulaEvaluator(sheet_cells)
        try:
            evaluator.compute_all()
        except FormulaError as exc:
            errors.append((sheet_name, "<sheet>", str(exc)))

        for ref, cell in sheet_cells.items():
            if cell.get("type") != "formula":
                continue
            formulas_checked += 1
            ref = FormulaEvaluator.normalize_ref(ref)
            expected = cell.get("value")
            try:
                actual = evaluator.get_cell_value(ref)
            except FormulaError as exc:
                errors.append((sheet_name, ref, str(exc)))
                continue
            if not values_match(actual, expected, args.tolerance):
                mismatches.append((sheet_name, ref, actual, expected, cell.get("formula", "")))

    print(f"Sheets checked: {len(all_cells)}")
    print(f"Formulas checked: {formulas_checked}")
    print(f"Mismatches: {len(mismatches)}")
    print(f"Errors: {len(errors)}")

    for sheet_name, ref, actual, expected, formula in mismatches[: args.max_errors]:
        print(f"MISMATCH {sheet_name}!{ref}: actual={actual!r} expected={expected!r} formula={formula}")

    for sheet_name, ref, message in errors[: args.max_errors]:
        print(f"ERROR {sheet_name}!{ref}: {message}")

    return 1 if mismatches or errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
