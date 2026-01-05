# Map OCR

This project has an OCR + AI metadata extraction pipeline for maps.

- The CLI entrypoint is `scripts/run_map_ocr_ai_backfill.py`
- It reads **`mapfile_original`** from the DB, runs Tesseract OCR, then optionally uses OpenAI to parse metadata.
- It can be run without starting the web server.
- The code is also exposed to the webapp so that it could be run every time a new map is saved.

## Requirements (local)

- Tesseract installed and available on PATH.
- Norwegian language pack (recommended): `nor.traineddata` in your Tesseract `tessdata/` directory.

### Install Tesseract + Norwegian language pack (Windows)

From an **elevated** PowerShell (admin):

```powershell
choco install tesseract
```

Install Norwegian language pack (places `nor.traineddata` in the default Tesseract `tessdata/` folder):

```powershell
Invoke-WebRequest -Uri "https://github.com/tesseract-ocr/tessdata/raw/main/nor.traineddata" -OutFile "C:\Program Files\Tesseract-OCR\tessdata\nor.traineddata"
```

Restart your terminal afterwards (so PATH updates apply), then verify:

```powershell
tesseract --version
tesseract --list-langs
```

## Common usage patterns

### Process all maps (dry-run)

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --all `
  --dry-run
```

### Process one specific map (dry-run; do everything except DB update)

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --map-name "bcup-2015-09-16-Stendskogen-N-10000" `
  --dry-run
```

### Process multiple specific maps (repeat `--map-name`)

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --map-name "bcup-2018-04-11-Skjold-B" `
  --map-name "bcup-2017-06-21-Landåsfjellet-A" `
  --map-name "bcup-2018-04-11-Skjold-B" `
  --dry-run
```

### Process a map id range (optionally with a limit)

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --id-min 200 `
  --id-max 350 `
  --limit 20 `
  --dry-run
```

### Write updates to DB (no `--dry-run`)

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --all
```

Notes:
- Updates are **best-effort** and only write into metadata fields that are currently empty/whitespace.
- The OpenAI API key can be passed once and will be stored in `internal_kv` for later runs.

## Debug / tuning examples

### Print OCR groups

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --map-name "..." `
  --dry-run `
  --debug-print-ocr
```

### Print OCR groups sorted by confidence

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --map-name "..." `
  --dry-run `
  --debug-print-ocr `
  --debug-print-ocr-sort-by-conf
```

### Write an annotated debug image (OCR boxes)

Directory output:

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --map-name "..." `
  --dry-run `
  --debug-image-out C:\Temp\ocr_debug
```

Template output (supports `{map_id}` and `{map_name}`):

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --map-name "..." `
  --dry-run `
  --debug-image-out "C:\Temp\ocr_debug\{map_id}_{map_name}.png"
```

### Override OCR tuning (Tesseract)

Current defaults (as of now):
- `--tesseract-psm 11`
- `--tesseract-min-conf 40`
- `--tesseract-max-dim 5000`

You can override any of these per run:

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --map-name "..." `
  --dry-run `
  --debug-print-ocr `
  --tesseract-psm 6 `
  --tesseract-min-conf 10 `
  --tesseract-max-dim 6000 `
  --tesseract-lang "nor+eng"
```

## OpenAI usage

### Provide key explicitly (and persist it)

```powershell
python scripts/run_map_ocr_ai_backfill.py `
  --db data/database.db `
  --map-name "..." `
  --dry-run `
  --openai-api-key "YOUR_KEY_HERE"
```

### Override the model

The default model is controlled by the `OPENAI_MODEL` environment variable (fallback is `gpt-5.1`).

```powershell
$env:OPENAI_MODEL = "gpt-5.1"
python scripts/run_map_ocr_ai_backfill.py --db data/database.db --map-name "..." --dry-run
```

