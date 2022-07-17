# RSS Exporter

Parse OPML file and export RSS feeds to a database.

## Usage

```sh
Example: deno run --allow-read --allow-net --allow-env export.ts -s RAW.opml -d postgresql://localhost:5432
flags:
  -h, --help: display help message
  -s, --source: rss opml file
  -d, --database: database url
```

## Example

Import
[RSSAggregatorforWeb3](https://github.com/chainfeeds/RSSAggregatorforWeb3) into
a local database.

```sh
deno run --allow-read --allow-net --allow-env export.ts -s RAW.opml -d postgresql://localhost:5432
```
