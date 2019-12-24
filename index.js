const request = require("request");
const cheerio = require("cheerio");
const slugify = require("slugify");

const SITE = "https://www.toramp.com/schedule.php?id=";
const pages = 3;
var k = 0;
const commondata = {
  serialGenres: [],
  serialAuthors: [],
  serialActors: [],
  serialStatuses: [],
  serialChannels: [],
  serials: []
};

try {
  console.log("Total pages done: " + pages);
  for (i = 1; i <= pages; i = i + 1) {
    ads = run(SITE, i);
  }
} catch (e) {
  throw e;
}

async function run(url, i) {
  const page = await getPage(url, i);

  var now = new Date();

  let oldgenres = [];
  let originalName = String;
  let detailInfoCommon = [];

  title = page(".title-basic span").text();
  originalName = page(".title-original").text();
  [name, years] = title.split(originalName);
  years = years.trim();
  rating = page(".r-a-n meta").attr("content");
  detailUrl = page(".content-widget-1 a").attr("href");
  shortDescription = page(".body_large").text();
  thumb = page("#img_basic img").attr("title");
  thumb_url = page("#img_basic img").attr("src");
  genresOfserial = page(".second-part-info a");
  seasons = page(".season-list tbody tr td a");

  page(".block_list").each((j, el) => {
    const blockCommon = page(el);
    detailInfoCommon.push(blockCommon.text());
  });
  status = detailInfoCommon[0];
  channel = detailInfoCommon[1];
  if (detailInfoCommon.length > 2) {
    if (detailInfoCommon.length == 4)
      [a, oldtags] = detailInfoCommon[3].split("\n\t\t");
    else [a, oldtags] = detailInfoCommon[2].split("\n\t\t");
    [oldtags, b] = oldtags.split("\t\t");
    oldtags = oldtags.split(", ");
  }
  genresOfserial.each(function(g, val) {
    g = g + 1;
    oldgenres.push(page(val).text());
  });

  code = slugify(originalName);
  let time = `${now.getDate()}.${now.getMonth()}.${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

  let data = {
    file_was_updated_at: time,
    code: code,
    name: name,
    seasons: seasons.length,
    originalName: originalName,
    years: years,
    status: status,
    channel: channel,
    rating: rating,
    shortDescription: shortDescription,
    thumb: thumb,
    thumb_url: thumb_url,
    genres: oldgenres,
    detailUrl: detailUrl
  };

  if (detailInfoCommon.length > 2) {
    let tagData = { tags: oldtags };
    data = Object.assign(data, tagData);
  }

  if (detailUrl != null) {
    var details = await getDetails(`https://www.toramp.com/${data.detailUrl}`);
    data = Object.assign(data, details);
  }

  writeData(data, code);

  if (
    Array.isArray(commondata.serialChannels) &&
    !commondata.serialChannels.includes(data.channel)
  )
    commondata.serialChannels.push(data.channel);

  if (
    Array.isArray(commondata.serialStatuses) &&
    !commondata.serialStatuses.includes(data.status)
  )
    commondata.serialStatuses.push(data.status);

  for (num = 0; num < data.genres.length; num++)
    if (!commondata.serialGenres.includes(data.genres[num]))
      commondata.serialGenres.push(data.genres[num]);

  if (detailUrl != null) {
    for (num = 0; num < data.authors.length; num++)
      if (!commondata.serialAuthors.includes(data.authors[num]))
        commondata.serialAuthors.push(data.authors[num]);

    for (num = 0; num < data.oldactors.length; num++)
      if (!commondata.serialActors.includes(data.oldactors[num]))
        commondata.serialActors.push(data.oldactors[num]);
  }
  pushSerialIntoCommonData(data, commondata);
  k = k + 1;
  writeCommonData(commondata, k);
}

async function pushSerialIntoCommonData(data, commondata) {
  let genres_ids = [];

  for (ind = 0; ind < data.genres.length; ind = ind + 1) {
    genres_ids = genres_ids.concat(
      commondata.serialGenres.indexOf(data.genres[ind]) + 1
    );
  }

  let pushData = {
    name: data.name,
    originalName: data.originalName,
    thumb: data.thumb,
    thumb_url: data.thumb_url,
    shortDescription: data.shortDescription,
    rating: data.rating,
    status_id: commondata.serialStatuses.indexOf(data.status) + 1,
    channel_id: commondata.serialChannels.indexOf(data.channel) + 1,
    genres_ids: genres_ids
  };

  if (data.detailUrl != null) {
    let authors_ids = [];
    let actors_ids = [];
    for (ind = 0; ind < data.authors.length; ind = ind + 1) {
      authors_ids = authors_ids.concat(
        commondata.serialAuthors.indexOf(data.authors[ind]) + 1
      );
    }

    for (ind = 0; ind < data.oldactors.length; ind = ind + 1) {
      actors_ids = actors_ids.concat(
        commondata.serialActors.indexOf(data.oldactors[ind]) + 1
      );
    }

    let detailpushData = {
      authors_ids: authors_ids,
      actors_ids: actors_ids
    };

    pushData = Object.assign(pushData, detailpushData);
  }

  commondata.serials.push(pushData);
  return commondata;
}

async function writeCommonData(data, k) {
  const savePath = require("path").join(
    __dirname,
    ".",
    "commonData",
    "commonData.json"
  );
  if (k == pages) {
    let newGenres = {};
    let newAuthors = {};
    let newActors = {};
    let newStatuses = {};
    let newChannels = {};

    data.serialGenres.forEach(function(prop, index) {
      newGenres[index + 1] = prop;
    });

    data.serialAuthors.forEach(function(prop, index) {
      newAuthors[index + 1] = prop;
    });

    data.serialActors.forEach(function(prop, index) {
      newActors[index + 1] = prop;
    });

    data.serialStatuses.forEach(function(prop, index) {
      newStatuses[index + 1] = prop;
    });

    data.serialChannels.forEach(function(prop, index) {
      newChannels[index + 1] = prop;
    });

    let newdata = {
      serialGenres: newGenres,
      serialAuthors: newAuthors,
      serialActors: newActors,
      serialStatuses: newStatuses,
      serialChannels: newChannels,
      serials: data.serials
    };
    require("fs").writeFileSync(savePath, JSON.stringify(newdata, null, 4));
    console.log("Success");
  } else require("fs").writeFileSync(savePath, JSON.stringify(data, null, 4));
}

async function writeData(olddata, code) {
  let genres = {};

  olddata.genres.forEach(function(prop, index) {
    genres[index + 1] = prop;
  });

  let data = {
    file_was_updated_at: olddata.file_was_updated_at,
    name: olddata.name,
    originalName: olddata.originalName,
    channel: olddata.channel,
    status: olddata.status,
    shortDescription: olddata.shortDescription,
    genres: genres,
    years: olddata.years,
    seasons: olddata.seasons,
    rating: olddata.rating,
    thumb: olddata.thumb,
    thumb_url: olddata.thumb_url
  };

  if (olddata.oldtags != null) {
    let tags = {};
    let tagsData = { tags: tags };
    olddata.tags.forEach(function(prop, index) {
      tags[index + 1] = prop;
    });
    data = Object.assign(data, tagsData);
  }

  if (olddata.detailUrl != null) {
    let actors = {};
    let authors = {};
    let detData = {
      authors: authors,
      actors: actors
    };

    if (olddata.detailUrl != null) {
      olddata.authors.forEach(function(prop, index) {
        authors[index + 1] = prop;
      });
    }

    if (olddata.detailUrl != null) {
      olddata.oldactors.forEach(function(prop, index) {
        actors[index + 1] = prop;
      });
    }

    data = Object.assign(data, detData);
  }
  console.log(data);
  const savePath = require("path").join(__dirname, ".", "data", `${code}.json`);
  require("fs").writeFileSync(savePath, JSON.stringify(data, null, 4));
}

async function getDetails(detUrl) {
  const $ = await getPageDetails(detUrl);
  let oldactors = [];
  let authors = [];
  let detailInfo = [];
  $(".block_list").each((h, el) => {
    const block = $(el);
    detailInfo.push(block.text());
  });
  let oldauthors = detailInfo[1].trim();
  if (oldauthors.indexOf("\n") != -1) authors = oldauthors.split("\n");
  else authors.push(oldauthors);
  oldactors = detailInfo[2].trim().split("\n");

  return {
    detailUrl: detUrl,
    authors: authors,
    oldactors: oldactors
  };
}

async function getPage(url, i) {
  return new Promise((resolve, reject) => {
    request(
      {
        url: `${url}${i}`
        //headers: {
        //"User-Agent":
        //"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36"
        //}
      },
      (error, respone, body) => {
        if (error) {
          return reject(error);
        }
        return resolve(cheerio.load(body));
      }
    );
  });
}

async function getPageDetails(url) {
  return new Promise((resolve, reject) => {
    request(
      {
        url: url
        //headers: {
        //"User-Agent":
        //"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36"
        //}
      },
      (error, respone, body) => {
        if (error) {
          return reject(error);
        }
        return resolve(cheerio.load(body));
      }
    );
  });
}
