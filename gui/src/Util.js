import localforage from "localforage";
import jxon from "jxon";
import { parse, parseISO, format, differenceInDays } from 'date-fns';
import Config from "./Config";
import saveAs from 'file-saver';

/**
 * Export one or multiple entries to ZIP Archive
 *
 * @param mixed ids
 *
 * @return promise with the ZIP as blob
 */
function entryCompress(ids) {
  const JSZip = require("jszip");
  const zip = new JSZip();

  if ('object' !== typeof ids) {
    ids = [ids];
  }

  let files = [];
  let fileLookup = {};
  let promises = ids.map( id => {
    return localforage.getItem('post-'+id).then(entry => {
      // attached files
      entry.files = entry.files.length ? entry.files.split(',') : [];
      if (entry.files.length) {
        files = files.concat(entry.files);
      }
      return entry;
    })
  });

  return Promise.all(promises).then(posts => {
    // add attachments to ZIP
    const filePromises = files.map(id => localforage.getItem(id).then(file => {
      fileLookup[file.id] = file.name;
      zip.file(file.name, file.data.split('base64,')[1], {base64: true});
    }));

    return Promise.all(filePromises).then(() => {
      // add posts to ZIP and replace file ID with file names
      for (let entry of posts) {
        entry.files = JSON.stringify(entry.files.map(file_id => ({name: fileLookup[file_id]})));
        zip.file(entry.id+'.xml', entry2XML(entry));
      }

      return zip.generateAsync({type:"blob"});
    });
  });
}

function exportEntries(ids) {
  let dayNum = null;
  let entry = null;

  const firstArticleId = 'object' === typeof ids ? 'post-'+ids[0] : 'post-'+ids;
  localforage.getItem(firstArticleId) // get first article just for ZIP name
    .then(e => {dayNum = getTripDay(e); entry = e;} )
    .then(() =>
      entryCompress(ids).then(blob => {
        const zipName = (dayNum ? 'Day '+dayNum : 'undefined')
          + format(entry.date, '-d MMM-')
          + entry.title + '.zip';
        saveAs(blob, zipName);
      })
    );
}

/**
 * delete one or several entries
 * @param {array} ids array or int
 */
function entry_delete(ids) {
  if ('object' === typeof ids) {
    return ids.map(id => entry_delete(id));
  }
  else {
    return localforage.getItem('post-'+ids).then(entry => {
      // deleting current article, empty editor
      // if (entry.id === this.state.entry.id) {
      //   this.entryCreateNew();
      // }
      if (null === entry) return;

      // delete attached files
      const files = entry.files.length ? entry.files.split(',') : [];
      if (files.length) {
        files.map(f => localforage.removeItem(f));
      }

      localforage.removeItem('post-' + entry.id);

      // update state
      // let entriesList = this.state.entries;
      // delete entriesList[entry.id];
      // this.setState({entries: entriesList})
   });
  }
}

function getTripDay(entry) {
  const blogs = Config.get('blogs');

  let dayNum = null;

  for (let i = 0; i < blogs.length; i++) {
    if (blogs[i].id === entry.blog_id) {
      const blog_start = parse(blogs[i].start_date, 'd MMM yyyy', new Date());
      dayNum = differenceInDays(parseISO(entry.date), blog_start)+1;
      break;
    }
  }
  return dayNum;
}

function entry2XML(entry) {
  const fields = ['id', 'date', 'title', 'body', 'author', 'location', 'blog_id', 'files', 'size', 'url', 'post_status'];
  const doc = {'post': {}};

  for (const f of fields) {
    doc.post[f] = entry.hasOwnProperty(f) ? entry[f] : '';
  }

  return '<?xml version="1.0"?>' + jxon.jsToString(doc);
}

function generateTagsCache() {
  let tags = [];
  return localforage.keys()
    .then(keys => keys.filter(key => key.indexOf('post-') === 0))
    .then(keys => keys.map(key => localforage.getItem(key)))
    .then(promises => Promise.all(promises))
    .then(data => {
      for (let i = 0; i < data.length; i++) {
        if ('object' === typeof data[i].tags) {
          for (let j = 0; j < data[i].tags.length; j++) {
            if (-1 === tags.indexOf(data[i].tags[j])) {
              tags.push(data[i].tags[j]);
            }
          }
        }
      }
      return localforage.setItem('tagsCache', tags);
    });
}

export { entryCompress, exportEntries, entry_delete, getTripDay, generateTagsCache }
