const { args } = Deno;
import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import * as log from "https://deno.land/std@0.148.0/log/mod.ts";
import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import * as postgres from "https://deno.land/x/postgres@v0.14.0/mod.ts";
import { Feed, parseFeed } from "https://deno.land/x/rss@0.5.6/mod.ts";
import { parse as parseXML } from "https://deno.land/x/xml@2.0.4/mod.ts";

const parsedArgs = parse(args);

function displayHelpMsg() {
  return `Example: deno run --allow-read --allow-net --allow-env export.ts -s RAW.opml -d postgresql://localhost:5432
flags:
  -h, --help: display help message
  -s, --source: rss opml file
  -d, --database: database url`;
}

async function getRSSFeed(opmlFile: string, connection: postgres.PoolClient) {
  // create table if not exists
  await createTable(connection);

  // get feeds url
  const feesUrl = getFeedsUrl(opmlFile);

  // get real feeds and write to database
  for (const url of feesUrl) {
    try {
      const text = await (await fetch(url)).text();
      const feed = await parseFeed(text);
      log.info(`fetched ${feed.entries.length} entries from ${url}`);
      await writeToDatabase(connection, feed);
    } catch (error) {
      log.error(error);
    }
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

async function createTable(connection: postgres.PoolClient) {
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
        content_type TEXT,
        content_value TEXT,
        comments TEXT,
        source TEXT,
        contributors TEXT,
        rights TEXT,
        attachments TEXT
      )
    `;
    // Create Unique Index
    await connection.queryObject`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_feeds_id ON feeds (id)
    `;
  } finally {
    // Release the connection back into the pool
    connection.release();
  }
}

async function writeToDatabase(connection: postgres.PoolClient, feed: Feed) {
  try {
    for (const entry of feed.entries) {
      await connection.queryObject
        `INSERT INTO feeds (title, description, link, id, author, published, updated, category, content_type, content_value, comments, source, contributors, rights, attachments) 
          VALUES (
            ${entry.title?.value}, 
            ${entry.description?.value}, 
            ${entry.links[0].href},
            ${entry.id}, 
            ${entry.author?.name}, 
            ${entry.published}, 
            ${entry.updated}, 
            ${JSON.stringify(entry.categories)}, 
            ${entry.content?.type}, 
            ${entry.content?.value}, 
            ${entry.comments},
            ${JSON.stringify(entry.source)}, 
            ${JSON.stringify(entry.contributors)}, 
            ${JSON.stringify(entry.rights)}, 
            ${JSON.stringify(entry.attachments)}) 
            ON CONFLICT (id) DO NOTHING`;
      log.info(`inserted entry ${entry.title?.value}, ${entry.id}`);
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
    case "s":
    case "database":
    case "d": {
      const opmlFile = parsedArgs.source || parsedArgs.s;
      const databaseUrl = parsedArgs.database || parsedArgs.d;
      if (opmlFile && databaseUrl) {
        // init pg client
        const pool = new postgres.Pool(databaseUrl, 3, true);
        const connection = await pool.connect();
        await getRSSFeed(opmlFile, connection);
      } else {
        console.log(displayHelpMsg());
      }
      break;
    }
    default:
      console.log(displayHelpMsg());
  }
}

main();
