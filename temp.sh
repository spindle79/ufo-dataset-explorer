pnpm run parse-csv data/nuforc/raw/nuforc_reports.csv data/nuforc/split "date_time,city,state,posted" 10
pnpm udb --count 100 -f csv --out data/larryhatch/export.csv
npm run cli -- -f csv --out export.csv --count 10
