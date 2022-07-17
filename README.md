# RSS Exporter

Parse OPML file and export RSS feeds to a database.

## Usage

```sh
deno run --allow-read --allow-net --allow-env export.ts -s RAW.opml -d postgresql://localhost:5432
```

## Help

```sh
Example: deno run --allow-read --allow-net --allow-env export.ts -s RAW.opml -d postgresql://localhost:5432
flags:
  -h, --help: display help message
  -s, --source: rss opml file
  -d, --database: database url
```
