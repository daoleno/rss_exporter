const { args } = Deno;
import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import * as log from "https://deno.land/std@0.148.0/log/mod.ts";
import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import * as postgres from "https://deno.land/x/postgres@v0.14.0/mod.ts";
import { Feed, parseFeed } from "https://deno.land/x/rss@0.5.6/mod.ts";
import { parse as parseXML } from "https://deno.land/x/xml@2.0.4/mod.ts";

const parsedArgs = parse(args);
const databaseUrl = Deno.env.get("DATABASE_URL")!;
const pool = new postgres.Pool(databaseUrl, 3, true);

// Connect to the database
const connection = await pool.connect();
try {
  // Create the table
  await connection.queryObject`
    CREATE TABLE IF NOT EXISTS feeds (
      title TEXT,
      description TEXT,
      link TEXT,
      id TEXT,
      author TEXT,
      published TEXT,
      updated TEXT,
      category TEXT,
      content TEXT,
      comments TEXT,
      source TEXT,
      contributors TEXT,
      rights TEXT,
      attachments TEXT
    )
  `;
} finally {
  // Release the connection back into the pool
  connection.release();
}

function displayHelpMsg() {
  return "flags:\n-h, --help: display help message\n-s, --source: rss opml file\n";
}

async function getRSSFeed(opmlFile: string) {
  // get feeds url
  const feesUrl = getFeedsUrl(opmlFile);

  // get real feeds
  for (const url of feesUrl) {
    const text = await (await fetch(url)).text();
    const feed = await parseFeed(text);
    log.info(`fetched ${feed.entries.length} entries from ${url}`);
    writeToDatabase(feed);
  }
}

function getFeedsUrl(opmlFileName: string) {
  // read opml file
  const fileContent = Deno.readTextFileSync(opmlFileName);
  const result: any = parseXML(fileContent.toString());

  // get all the feeds url
  const feedsUrl = result.opml.body.outline.map((item: any) =>
    item.outline.map((feed: any) => feed["@xmlUrl"])
  );
  return feedsUrl.flat();
}

function writeToDatabase(feed: Feed) {
  try {
    for (const entry of feed.entries) {
      const {
        title,
        description,
        links,
        id,
        author,
        published,
        updated,
        categories,
        content,
        comments,
        source,
        contributors,
        rights,
        attachments,
      } = entry;
      const values = [
        title,
        description,
        links[0].href,
        id,
        author,
        published,
        updated,
        categories,
        content,
        comments,
        source,
        contributors,
        rights,
        attachments,
      ];
      const query = `INSERT INTO feeds VALUES (${values.map(
        (value) => `'${value}'`
      )})`;
      connection.queryObject(query);
    }
  } catch (error) {
    console.log(error);
  } finally {
    connection.release();
  }
}

async function main() {
  switch (Object.keys(parsedArgs)[1]) {
    case "help":
    case "h":
      console.log(displayHelpMsg());
      break;
    case "source":
    case "s": {
      const opml = parsedArgs.s || parsedArgs.source || "";
      await getRSSFeed(opml);
      break;
    }
    default:
      console.log(displayHelpMsg());
  }
}

main();
