"""
InfluentLab - Web Application
Wastewater influent characterization tool based on IWA Activated Sludge Models
"""
import json
import os
import sys
import webbrowser
import markdown
from flask import Flask, render_template, jsonify, request

# Handle PyInstaller bundled path
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    BASE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
    STATIC_DIR = os.path.join(BASE_DIR, 'static')
    app = Flask(__name__,
                template_folder=TEMPLATE_DIR,
                static_folder=STATIC_DIR,
                static_url_path='/static')
else:
    # Running as script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    app = Flask(__name__)
    app.config['TEMPLATES_AUTO_RELOAD'] = True

# Load data
DATA_PATH = os.path.join(BASE_DIR, "data", "sheets_data.json")
CELLS_PATH = os.path.join(BASE_DIR, "data", "cells.json")

with open(DATA_PATH, 'r', encoding='utf-8') as f:
    SHEETS_DATA = json.load(f)

CELLS_DATA = None

def get_cells():
    """Lazy-load cells.json"""
    global CELLS_DATA
    if CELLS_DATA is None:
        if os.path.exists(CELLS_PATH):
            with open(CELLS_PATH, 'r', encoding='utf-8') as f:
                CELLS_DATA = json.load(f)
        else:
            CELLS_DATA = {}
    return CELLS_DATA

# Build lookup: (library, model_group, view) -> sheet_name
SHEET_LOOKUP = {}
for sname, sinfo in SHEETS_DATA["sheets"].items():
    lib = sinfo.get("library_suffix") or sinfo.get("library", "")
    mg = sinfo.get("model_group", "")
    view = sinfo.get("view", "")
    key = f"{lib}|{mg}|{view}"
    SHEET_LOOKUP[key] = sname


@app.route('/')
def index():
    """Intro page"""
    return render_template('index.html',
                         libraries=SHEETS_DATA.get("libraries", []),
                         models=SHEETS_DATA.get("models", []))


@app.route('/data/sheets.json')
def get_sheets_data():
    """Serve the full data JSON"""
    return jsonify(SHEETS_DATA)


@app.route('/data/cells.json')
def get_cells_data():
    """Serve the complete cell data (formulas + constants)"""
    cells_path = os.path.join(BASE_DIR, "data", "cells.json")
    if os.path.exists(cells_path):
        with open(cells_path, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    return jsonify({"error": "cells.json not found"})


@app.after_request
def prevent_stale_static_and_data(response):
    """Avoid stale app.js/data while validating the migrated Excel logic."""
    if request.path.startswith('/static/') or request.path.startswith('/data/'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response


@app.route('/theory')
def theory():
    """Serve the theoretical documentation (TEORIA_INFLUENT_ADVISOR.md) as HTML"""
    md_path = os.path.join(BASE_DIR, 'TEORIA_INFLUENT_ADVISOR.md')
    if not os.path.exists(md_path):
        return "Theory document not found.", 404
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    html_content = markdown.markdown(
        md_content,
        extensions=['fenced_code', 'tables', 'codehilite']
    )
    return render_template('theory.html', content=html_content)


@app.route('/sheet')
def sheet():
    """Display a specific sheet"""
    lib = request.args.get('lib', 'CN')
    model = request.args.get('model', 'ASM1-Mantis')
    view = request.args.get('view', 'States')
    
    # Build exact lookup keys. CN sheets may be keyed by either the header
    # library ("CN") or a blank suffix, while CNP sheets use the CNP suffix.
    candidate_libs = ["CNP"] if lib == "CNP" else ["CN", ""]
    sheet_name = None
    for lib_key in candidate_libs:
        key = f"{lib_key}|{model}|{view}"
        sheet_name = SHEET_LOOKUP.get(key)
        if sheet_name:
            break

    if not sheet_name:
        for key, value in SHEET_LOOKUP.items():
            key_lib, key_model, key_view = key.split("|", 2)
            lib_matches = key_lib in candidate_libs
            if lib_matches and key_model == model and key_view == view:
                sheet_name = value
                break
    
    if not sheet_name:
        return f"Sheet not found for lib={lib}, model={model}, view={view}", 404
    
    sheet_info = SHEETS_DATA["sheets"].get(sheet_name, {})
    return render_template('sheet.html',
                         sheet=sheet_info,
                         sheet_name=sheet_name,
                         lib=lib,
                         model=model,
                         view=view)


@app.route('/api/defaults')
def get_defaults():
    """Get default values for a specific sheet from cells.json"""
    sheet_name = request.args.get('sheet', '')
    
    cells = get_cells()
    sheet_cells = cells.get(sheet_name, {})
    
    # Collect all E-column cells (user inputs) that have constant values
    defaults_list = []
    for cell_ref, cell_info in sheet_cells.items():
        if cell_ref.startswith('E') and cell_info.get('type') == 'constant':
            val = cell_info.get('value')
            if val is not None:
                try:
                    val = float(val)
                except (ValueError, TypeError):
                    pass
                defaults_list.append({"cell": cell_ref, "value": val})
    
    # Sort by row number
    defaults_list.sort(key=lambda x: int(x['cell'][1:]) if x['cell'][1:].isdigit() else 0)
    
    return jsonify({"sheet": sheet_name, "defaults": defaults_list})


if __name__ == '__main__':
    import os as _os
    _on_render = 'RENDER' in _os.environ
    port = int(_os.environ.get('PORT', 5000))
    host = '0.0.0.0' if _on_render else '127.0.0.1'

    print(f"\n  {'='*50}")
    print(f"  InfluentLab v1.0")
    print(f"  {'='*50}")
    print(f"  Server: http://{host}:{port}")
    print(f"  Press Ctrl+C to stop")
    print(f"  {'='*50}\n")

    if not _on_render:
        webbrowser.open(f'http://127.0.0.1:{port}')

    if _on_render:
        from waitress import serve
        serve(app, host=host, port=port)
    else:
        app.run(host=host, port=port, debug=False)
