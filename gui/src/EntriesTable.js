import React from "react";
import Config from "./Config";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import MUIDataTable from "mui-datatables";
import Chip from '@material-ui/core/Chip';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import LinkIcon from '@material-ui/icons/Link';
import ImportIcon from '@material-ui/icons/Unarchive';
import ExportIcon from '@material-ui/icons/Archive';
import DeleteIcon from '@material-ui/icons/Delete';
import jxon from "jxon";

// import Observable from 'zen-observable';
import localforage from 'localforage';
// import 'localforage-observable';

import { exportEntries, entry_delete, getTripDay } from './Util.js';
import CustomSnackbar, { openSnackbar } from './CustomSnackbar';

const styles = theme => ({
  // root: {
  //   width: '100%',
  //   marginTop: theme.spacing.unit * 3,
  // },
  table: {
//    minWidth: 1020,
  },
  tableWrapper: {
       overflowX: 'auto',
  },
  iconButton: {
    // marginRight: "24px",
    top: "50%",
    display: "inline-block",
    position: "relative",
    transform: "translateY(-50%)"
  },
  hidden: { display: 'none', },
  chip: { marginRight: theme.spacing.unit },
});

class EntriesTable extends React.Component {
  state = {
    showDeleteConfirm: false,
    rowsSelected: [],
    blogs: {},
    entries: [],
  };

  componentDidMount() {
    this.entries_load();

    localforage.getItem('tags').then(tags => {
      if (null === tags) return;
      this.setState({'tags': Object.keys(tags)});
    })

    Config.getAsync('blogs', [])
      .then(arr => {
        let blogs = {};
        for (let blog of arr) {
          blogs[blog.id] = blog.blog_name;
        }
        this.setState({blogs});
      });
  }

  entries_load = () => {
    console.log('Loading ALL posts.');

    localforage.keys()
      .then(keys => keys.filter(key => key.indexOf('post-') === 0))
      .then(keys => keys.map(key => localforage.getItem(key)))
      .then(promises => Promise.all(promises))
      .then(data => {
        const entries = [];
        data.forEach(e => {
          if (null === e) return;
          const size = e.size ? e.size : 0;
          const dayNum = getTripDay(e);

          entries.push([
            e.id,
            e.title,
            e.location,
            'object' === typeof e.tags ? e.tags.join(', ') : '',
            this.blogName(e.blog_id),
            e.body,
            e.date,
            dayNum ? 'Day ' + dayNum : 'undefined',
            size,
            e.url,
            '' === e.post_status ? 'not published': e.post_status,
          ]);
        });
        this.setState({entries});
      });
  }

  blogName(blog_id) {
    return this.state.blogs.hasOwnProperty(blog_id) ? this.state.blogs[blog_id] : '';
  }

  deleteConfirm = () => {
    this.setState({showDeleteConfirm: true});
  }
  deleteCancel = () => {
    this.setState({showDeleteConfirm: false});
  }
  deleteEntries = () => {
    const selected = this.state.rowsSelected.map(id => this.state.entries[id][0]);
    entry_delete(selected);
    this.setState({rowsSelected: []});
    this.entries_load();
    this.deleteCancel();
  }

  bytesToSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return 'n/a';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    if (i === 0) return bytes + ' ' + sizes[i];
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
  }

  onClickEntry = (id, e) => {
    e.preventDefault();
    this.props.onClickEntry(id);
  }

  zipChoosed = (evt) => {
    this.import_entries(evt.target.files[0]);
  }

  // import articles from ZIP
  import_entries = (file) => {
    const JSZip = require("jszip");
    const uuid = require('uuid/v4');
    const mime = require('mime/lite');
    let zipArchive = null;
    return JSZip.loadAsync(file)
      .then(zip => {
        zipArchive = zip;
        return zip.file(/\.xml$/); // find XML files
      })
      .then(xmlFiles =>
        xmlFiles.map(zip => zip.async('string').then(xml => {
          const json = jxon.stringToJs(xml);
          // does XML contains a post?
          if ( ! json.hasOwnProperty('post')) return;

          // delete extry if exist
          return entry_delete(json.post.id)
            .then(() => {
              const files = JSON.parse(json.post.files);
              const promises = files.map(file =>
                zipArchive.file(file.name).async('base64')
                .then(base64 => {
                  const mimeType = mime.getType(file.name);
                  const buf = {
                    id: uuid(),
                    name: file.name,
                    type: mimeType,
                    data: 'data:' + mimeType + ';base64,' + base64,
                  };
                  localforage.setItem(buf.id, buf);
                  return buf.id;
                })
              );

              return Promise.all(promises)
                .then(names => {
                  let entry = json.post;
                  entry.files = names.join(',');
                  localforage.setItem('post-' + entry.id, entry);
                });
            });
        }))
      )
      .then(promises => {
        Promise.all(promises).then(() => {
          this.entries_load();
          openSnackbar({message: 'Articles imported.', type: 'success'});
        })
      })
      .catch(() => openSnackbar({message: 'Invalid file.', type: 'error'}));
  }

  importClicked() {
    document.getElementById('importZIPFile').value = '';
    document.getElementById('importZIPFile').click();
  }

  customToolbar = () => {
    return (
      <Tooltip title="Import ZIP">
        <IconButton onClick={this.importClicked}>
          <ImportIcon />
        </IconButton>
      </Tooltip>
    );
  }

  onRowsSelect = (currentRowsSelected, allRowsSelected) => {
    let selected = [];
    for (let i = 0; i < allRowsSelected.length; i++) {
      selected.push(allRowsSelected[i].dataIndex);
    }
    this.setState({rowsSelected: selected});
  }

  titleRender = (value, tableMeta, updateValue) => {
    const title = value ? value : '(empty)';
    return <a href="" onClick={(e) => this.onClickEntry(tableMeta.rowData[0], e)}>{title}</a>;
  }

  tagsRender = (value) => {
    const tags = value.split(', ');
    let out = [];
    for (let i = 0; i < tags.length; i++) {
      if ('' === tags[i]) continue;
      out.push(<Chip label={tags[i]} key={i} className={this.props.classes.chip} />);
    }
    return out;
  }

  urlRender(value, tableMeta) {
    return value ? (
          <IconButton href={value} target="_blank" className={'status-'+tableMeta.rowData[9]}><LinkIcon /></IconButton>
        ) : ('');
  }

  entries_export = () => {
    const selected = this.state.rowsSelected.map(id => this.state.entries[id][0]);
    exportEntries(selected);
  }

  customToolbarSelect = () => {
    return (
      <div style={{paddingRight: '24px'}}>
        <Tooltip title="Export">
          <IconButton onClick={this.entries_export} className={this.props.classes.iconButton}>
            <ExportIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton onClick={this.deleteConfirm} className={this.props.classes.iconButton}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>
    );
  }

  render() {
    const { classes } = this.props;
    const columns = [
      {name: "ID", options: {filter: false, display: false, sort: false}},
      {name: "Title", options: {filter: false, customBodyRender: this.titleRender}},
      {name: "Location", options: {display: false}},
      {name: "Tag", options: {customBodyRender: this.tagsRender}},
      {name: "Blog", options: {filter: false, display: false}},
      {name: "Text", options: {filter: false, display: false, sort: false}},
      {name: "Date", options: {filter: false}},
      {name: "Day #", options: {filter: false, sort: false}},
      {name: "Size", options: {filter: false, display: false, customBodyRender: size => this.bytesToSize(size)}},
      {name: "URL", options: {filter: false, customBodyRender: this.urlRender}},
      {name: "Status"},
    ];
    const tableOptions = {
      download: false,
      print: false,
      responsive: 'scrollMaxHeight',
      rowsSelected: this.state.rowsSelected,
      onRowsSelect: this.onRowsSelect,
      customToolbar: this.customToolbar,
      customToolbarSelect: this.customToolbarSelect,
    };

    return(
        <div>
          <MUIDataTable
            title={"Articles"}
            data={this.state.entries}
            columns={columns}
            options={tableOptions}
          />

          <Dialog
            open={this.state.showDeleteConfirm}
            onClose={this.deleteCancel}
          >
            <DialogContent>
              <DialogContentText>Delete selected articles?</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.deleteEntries}>Delete</Button>
              <Button color="primary" onClick={this.deleteCancel} autoFocus>Cancel</Button>
            </DialogActions>
          </Dialog>

          <CustomSnackbar />
        <input type="file" id="importZIPFile"
          className={classes.hidden} accept="application/zip"
          onChange={this.zipChoosed} />
      </div>
    );
  }
}

EntriesTable.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(EntriesTable);
