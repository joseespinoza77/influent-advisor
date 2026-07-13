# InfluentLab — Academic Wastewater Characterization Prototype

InfluentLab is an academic and educational prototype designed to convert conventional wastewater characterization parameters — such as COD, BOD, TSS, nitrogen and phosphorus — into model-specific state variables used by IWA Activated Sludge Models (ASM).

This project originated in the context of a university course and consists of an experimental migration from an Excel/VBA-based tool to a web application, exploring the digitalization of technical tools used in environmental engineering.

## Features

- Selection of CN (Carbon/Nitrogen) and CNP (Carbon/Nitrogen/Phosphorus) libraries
- Experimental compatibility with ASM1, ASM2d, ASM3 and related models
- Four input methods: States, BOD-based, TSS/COD and COD Fractions
- Client-side calculation engine in JavaScript
- Backend developed with Flask
- Deployment on Render
- Integrated theoretical documentation
- Default value loading for each sheet

## Technologies

- Python
- Flask
- JavaScript
- HTML / CSS
- JSON
- Waitress (production server)
- Render (deployment)

## Demo

A live demo is available at:

**<https://influentlab.onrender.com/>**

> Note: The application is hosted on a free Render tier and may take a few seconds to wake up on the first request.

## Project Context

The main goal of this project was to explore the digitalization of technical tools used in environmental engineering, and to demonstrate the integration between process knowledge, programming and web development.

The underlying calculations are based on published IWA Activated Sludge Models (ASM1, ASM2, ASM2d, ASM3) as described in the scientific literature (Henze et al., 2000; Metcalf & Eddy, 2013).

## Validation

The migrated formulas can be compared against cached values from the original Excel workbook using the included `validate_formulas.py` script. This represents a preliminary migration validation — it verifies that the JavaScript engine reproduces the same results as the original spreadsheet, but it does not constitute an independent professional validation for engineering design purposes.

## Known Limitations

- This is an **academic prototype**, not a production-grade engineering tool.
- It is **not intended for definitive facility design** or sizing calculations.
- It should **not be used for operational or engineering decisions** without independent verification by a licensed professional.
- Input fields do not yet incorporate all possible physical and consistency validations.
- Error handling and automated test coverage can be improved.
- Some model names or commercial references may be included solely for educational and reference purposes.

## Running Locally

```bash
git clone https://github.com/joseespinoza77/Influent-Lab.git
cd Influent-Lab
pip install -r requirements.txt
python app.py
```

The application will be available at:

```text
http://127.0.0.1:5000
```

## Author

### José Espinoza Aburto

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/jose-espinoza-aburto/)

## Disclaimer

This is an independent, unofficial tool created for educational and reference purposes only. It implements wastewater influent characterization calculations based on published IWA Activated Sludge Models. It is not affiliated with, endorsed by, or associated with any commercial simulation software provider. Calculations are provided "AS IS" with no warranties of accuracy or fitness for any particular purpose.
