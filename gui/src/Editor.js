import React from "react";
// import Observable from 'zen-observable';
import localforage from "localforage";
import Config from "./Config";
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
//import AttachIcon from '@material-ui/icons/AttachFile';
import SaveIcon from '@material-ui/icons/Save';
import DeleteIcon from '@material-ui/icons/Delete';
import CreateIcon from '@material-ui/icons/Create';
import CopyIcon from '@material-ui/icons/FileCopy';
import ExportIcon from '@material-ui/icons/Archive';
import Grid from '@material-ui/core/Grid';
import FormControl from '@material-ui/core/FormControl';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import Tooltip from '@material-ui/core/Tooltip';
import Select from '@material-ui/core/Select';
import Autosuggest from './Autosuggest';
import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/ArrowBack';
import LinkIcon from '@material-ui/icons/Link';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import CustomSnackbar, { openSnackbar } from './CustomSnackbar';
import { entryCompress, exportEntries, entry_delete, generateTagsCache, getTripDay } from './Util.js';
/* eslint-disable */
import { format } from 'date-fns';
import DateFnsUtils from '@date-io/date-fns';
DateFnsUtils.prototype.startOfMonth = DateFnsUtils.prototype.getStartOfMonth
import { DatePicker, MuiPickersUtilsProvider } from 'material-ui-pickers';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';

const fileListStyles = {
  ul: {
    padding: 0,
    margin: 0,
    listStyleType: 'none',
  },
  li: {
    display: 'inline-block',
    marginRight: '10px',
  },
  img: {
    maxHeight: '50px',
    maxWidth: '50px',
  },
  hidden: { display: 'none' },
  dragdrop: {
    border: '1px dashed',
    padding: '5px 0',
    margin: '5px 0',
    cursor: 'pointer',
    color: 'rgba(0,0,0,0.45)',
  },
};

class Attachments extends React.Component {
  state = {
    files: [],
    filesInProcess: 0,
    viewIndex: false,
  };

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps) {
    if (this.props.files !== prevProps.files) {
      this.fetchData();
    }
  }

  fetchData() {
    if (this.props.files.length) {
      console.log('loading ALL entry\'s images');
      const ids = this.props.files.split(',');
      const promises  = ids.map((id) => localforage.getItem(id));
      Promise.all(promises).then((results) => this.setState({ files: results }));
    }
    else {
      this.setState({ files: [] });
    }
  }

  dragEvent(e) {
    e.stopPropagation();
    e.preventDefault();
  }


  attachClicked() {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInput').click();
  }

  // valueUpdated(e) {
  //   this.props.updateField(e.target.name, e.target.value);
  // }

  // save attached files to DB
  handleFileSelect = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();

    // is the event Drag'n'Drop or file input?
    const files = evt.hasOwnProperty('dataTransfer') ? evt.dataTransfer.files : evt.target.files;

    const imgTypes = ['image/jpeg', 'image/png'];
    const _this = this;
    for (var i = 0; i < files.length; i++) {
      let reader = new FileReader();
      reader.onload = (function(file) { return function() {
        const uuid = require('uuid/v4');
        const key = uuid();
        // process image and resize it if needed
        if (imgTypes.includes(file.type)) {
          _this.setState({filesInProcess: _this.state.filesInProcess+1})
          let worker = new Worker("static/js/jimp-worker.js");
          worker.onmessage = function (e) {
            const data = {id: key, name: file.name, type: file.type, data: e.data};
            localforage.setItem(key, data).then(function() {
              // update file list
              const fileList = _this.props.files.length ? _this.props.files.split(',') : [];
              fileList.push(key);
              _this.props.updateField('files', fileList.join(','));
              _this.setState({filesInProcess: _this.state.filesInProcess-1})
            });
          };
          worker.postMessage(this.result);
        }
//        else { // not an image, simply save to DB
//          const data = {id: key, name: file.name, type: file.type, data: this.result};
//          localforage.setItem(key, data);
//        }
      };
    })(files[i]);
      reader.readAsDataURL(files[i]);
    }
  }

  open = (id, evt) => {
    evt.preventDefault();
    evt.stopPropagation();

    for (let i = 0; i < this.state.files.length; i++) {
      if (this.state.files[i].id === id) {
        this.setState({viewIndex: i});
        break;
      }
    }
//    this.props.edit(file);
  }
  closeViewImage = (evt) => {
//    evt.preventDefault();
    this.setState({viewIndex: false});
  }

  deleteFile = (id) => {
    localforage.removeItem(id);

    // update file list
    const fileList = this.props.files.length ? this.props.files.split(',') : [];
    const index = fileList.indexOf(id);
    if (index > -1) {
      fileList.splice(index, 1);
      this.props.updateField('files', fileList.join(','));
    }
  }

  render() {
    // let files = <div style={{textAlign: 'center', height: '50px', lineHeight: '50px'}}>Drop files here or click to upload.</div>;
    let files = <div style={{height: '50px', lineHeight: '50px'}}>Photos/Videos</div>;
    if (this.state.files.length > 0 || this.state.filesInProcess > 0)
    {
      let filesInProcess = [];
      for (let i = 0; i < this.state.filesInProcess; i++) {
        filesInProcess.push(<li key={i} className={this.props.classes.li}><CircularProgress /></li>);
      }

      files = (
        <ul className={this.props.classes.ul}>
          {this.state.files.map(file =>
            <li key={file.id} className={this.props.classes.li}><a href="#a" onClick={this.open.bind(this, file.id)}><img src={file.data} alt="" className={this.props.classes.img}/></a></li>
          )}
          {filesInProcess}
        </ul>);
    }

    return (
      <div>
        <div id="drag-drop-area"
          onDragOver={this.dragEvent}
          onDrop={this.handleFileSelect}
          className={this.props.classes.dragdrop}
          onClick={this.attachClicked}
        >
          {files}
          <input id="fileInput" type="file" className={this.props.classes.hidden} multiple
            accept="image/x-png,image/jpeg"
            onChange={this.handleFileSelect} />
        </div>

        <ImageCarousel
          files={this.state.files}
          index={this.state.viewIndex}
          close={this.closeViewImage}
          delete={this.deleteFile}
        />
      </div>
    )
  }
}
const FileList = withStyles(fileListStyles)(Attachments);

class ImageCarousel extends React.Component {
  index = 0;
  state = {
    showDeleteConfirm: false,
  }

  shouldComponentUpdate(nextProps) {
    if (this.props.index !== nextProps.index) {
      this.index = 'number' === typeof nextProps.index ? nextProps.index : 0;
    }
    return true;
  }

  deleteConfirm = () => {
    this.setState({showDeleteConfirm: true});
  }
  deleteCancel = () => {
    this.setState({showDeleteConfirm: false});
  }
  deleteFile = () => {
    this.props.delete(this.props.files[this.index].id);

    // switch to next slide
    if (this.index-1 >= 0 ) {
      this.index--;
    } else {
      this.props.close();
    }
    this.setState({showDeleteConfirm: false});
  }

  slideChanged = (index) => {
    this.index = index;
  }

  render() {
    // console.log(this.props.files); // TODO: debug this!!!
    if (0 === this.props.files.length) return '';
    const height = window.innerHeight - 64;
    return (
      <Dialog
        fullScreen
        open={"number" === typeof this.props.index}
        onClose={this.props.close}
      >
        <AppBar style={{position: 'relative'}}>
          <Toolbar>
            <IconButton color="inherit" onClick={this.props.close} aria-label="Close">
              <CloseIcon />
            </IconButton>

            <Typography color="inherit" style={{flex: 1}}></Typography>

            <Button color="inherit" onClick={this.deleteConfirm}>
              Delete
            </Button>
          </Toolbar>
        </AppBar>
        <Carousel
          selectedItem={this.index}
          infiniteLoop={true}
          showThumbs={false}
          onChange={this.slideChanged}
        >
          {this.props.files.map(file =>
            <div key={file.id} className="img-wrap" style={{height: height+'px'}}><img src={file.data} alt="" /></div>
          )}
        </Carousel>

        <Dialog
          open={this.state.showDeleteConfirm}
          onClose={this.deleteCancel}
        >
          <DialogContent>
            <DialogContentText>Delete this photo?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.deleteFile}>Delete</Button>
            <Button onClick={this.deleteCancel} color="primary" autoFocus>Cancel</Button>
          </DialogActions>
        </Dialog>

      </Dialog>
    );
  }
}

const styles = theme => ({
  // root: theme.mixins.gutters({
  //   marginTop: theme.spacing.unit * 3,
  //   paddingBottom: 16,
  // }),
  wrapper: {
    display: 'inline-block',
    margin: theme.spacing.unit,
    marginLeft: 0,
    position: 'relative',
  },
  buttonProgress: {
//    color: green[500],
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  btnRow: {
    display: 'flex',
    [theme.breakpoints.down('xs')]: {
      display: 'block',
    },
  },
  mainBtns: {
    flexGrow: 1,
  },
});

class Editor extends React.Component {

  state = {
    imageEdit: false,
    showDeleteEntry: false,
    blogs: [],
    locations: [],
    authors: [],
    entry: this.entry_template(),
    entry_saved: false,
    uploadProgress: null,
    entry_tags: [],
    minDate: '2017-01-01',
    maxDate: '2050-01-01',
    tagsCache: [],
    entryState: []
  };

  constructor(props) {
    super(props);

    // setup localforage observer
    // localforage.newObservable.factory = function (subscribeFn) {
    //   return new Observable(subscribeFn);
    // };
    // localforage.ready().then(_ => {
    //   const observable = localforage.newObservable({removeItem: true});
    //   observable.subscribe({
    //     next: args => {
    //       // current entry has been deleted, create new in editor
    //       if ('removeItem' === args.methodName && this.state.entry.id === args.oldValue.id) {
    //         this.entry_create_new();
    //       }
    //     }
    //   });
    // });

    this.valueUpdated = this.valueUpdated.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  componentDidMount() {
    this.entry_load(this.props.id);

    Config.getAsync('blogs', []).then(blogs => {
      const empt = [{id: 0, blog_name: '', body: '', participants: [], location: []}];
      this.setState({blogs: empt.concat(blogs)});
    });

    Config.getAsync('locations', [])
      .then(locations => locations.map(l => ({value: l, label: l})))
      .then(locations => this.setState({locations}));

    localforage.getItem('tagsCache').then(cache => {
      if (null === cache) {
        generateTagsCache().then(cache => this.setState({tagsCache: cache}));
      }
      else {
        this.setState({tagsCache: cache});
      }
    })
  }

  // componentWillUnmount() {
  //   // save post
  //   if (this.saveTimeout) {
  //     this.entry_save();
  //     clearTimeout(this.saveTimeout);
  //   }
  // }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.id !== prevProps.id) {
      this.entry_load(this.props.id);
    }

    // update authors list according to selected blog
    if (this.state.entry.blog_id !== prevState.entry.blog_id) {
      for (let i of this.state.blogs) {
        if (i.id === this.state.entry.blog_id) {
          // const authors = [''].concat(i.participants.sort());
          const authors = i.participants.sort().map(name => ({
            value: name,
            label: name,
          }));
          const locations = i.location.sort().map(name => ({
            value: name,
            label: name,
            }));
          const minDate = i.start_date;
          const maxDate = i.end_date;
          this.setState({authors, locations, minDate, maxDate});
          break;
        }
      }
    }
  }

  entry_load = (entry_id) => {
    localforage.getItem('post-' + entry_id).then(entry => {
      if (null === entry) {
        entry = this.entry_template();
      }
      // fix for old ZIP files
      if ( ! entry.hasOwnProperty('tags')) entry.tags = [];

      this.setState({entry, entry_saved: true});
      if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        console.log('Open entry:', entry);
      }
    });

    localforage.getItem('tags').then(tags => {
      if (null === tags) return;
      let buf = [];
      for (let tag in tags) {
        if (tags[tag].includes(this.state.entry.id)) {
          buf.push(tag);
        }
      }
      this.setState({entry_tags: buf});
    });
  }

  entry_template() {
    const date = new Date();
    return {
      id: Math.round(date.getTime() / 1000),
      blog_id: '',
      date: date.toISOString().split("T")[0],
      author: '',
      location: '',
      title: '',
      body: '',
      files: '',
      post_status: '',
      url: '',
      tags: [],
    };
  }

  valueUpdated(e) {
    if(e.target.name != 'blog_id'){
      this.setState(state => state.entry.post_status = "not published");
    }
    this.set_field(e.target.name, e.target.value);
  }

  set_field = (name, value) => {

    // update authors list according to selected blog
    if ('blog_id' === name) {
      if( this.state.entry.blog_id != '' ){
        let newEntry = this.entry_template();
        let blogs = this.state.blogs;
        let selectedBlog = blogs[0];
        blogs.map((blog)=>{
          if( blog.id == value ){
            selectedBlog = blog;
          }
        });
        newEntry.blog_id = selectedBlog.id;
        newEntry.title = selectedBlog.blog_name;
        newEntry.body = selectedBlog.body;
        newEntry.location = '';
        newEntry.author = '';
        this.setState(state => {
          state.entry.id = newEntry.id;
          state.entry.blog_id = newEntry.blog_id;
          state.entry.date = newEntry.date;
          state.entry.author = '';
          state.entry.location = '';
          state.entry.title = newEntry.title;
          state.entry.body = entry.body;
          state.entry.files = '';
          state.entry.post_status =  '';
          state.entry.url =  '';
          state.entry.tags = [];
          state.entry_saved = false;
        });
      }
      for (let i of this.state.blogs) {
        if (i.id == value) {
          this.setState(state=>(state.entry.title = i.blog_name,state.entry.body = i.body));
        // const authors = [''].concat(i.participants.sort());
         if(i.participants){
          const authors = i.participants.sort().map(name => ({
              value: name,
              label: name,
            }));
            this.setState({authors});
          }
          if(i.location){       
           const locations = i.location.sort().map(name => ({
            value: name,
            label: name,
            }));
            this.setState({locations});
          }
          break;
        }
      }
    }

    let entry = this.state.entry;
    entry[name] = value;
    this.setState({entry, entry_saved: false});

    // recalculate size
    if ('files' === name) {
      if (value.length) {
        Promise.all(value.split(',').map(id => localforage.getItem(id)))
          .then(data => {
            entry.size = 0;
            for (let file of data) {
              entry.size += atob(file.data.split('base64,')[1]).length;
            }
            this.setState({entry});
          });
      }
      else {
        entry.size = 0;
        this.setState({entry});
      }
    }

  }

  onDateChange = date => {
    this.set_field('date', format(date, 'yyyy-MM-dd'));
  }

  entry_save = (publish = '') => {
    console.log('Saving entry.');
    localforage.setItem('post-' + this.state.entry.id, this.state.entry)
      .then(() => {
        this.setState({entry_saved: true});
        if( publish == 'publish' ){
          this.publish('publish');
        }
      }); 
  }

  createPostCall = (index, data) => {
    localforage.setItem('post-' + data[index].id, {
        "id": data[index].id,
        "blog_id": data[index].blog_id,
        "date": data[index].date,
        "author": data[index].author,
        "location": data[index].location,
        "title": data[index].title,
        "body": data[index].body,
        "files": data[index].files,
        "post_status": data[index].post_status == '' ? 'not published': data[index].post_status,
        "url": '',
        "tags": [],
      }
    );

    if( data[index].post_status != 'future' && data[index].post_status !== 'publish' ) {

      entryCompress(data[index].id).then(blob => {
        const form = new FormData();
        form.append('action', 'gxg_import');
        form.append('key', Config.get('remote.key'));
        form.append('file', blob, 'export.zip');

        const axios = require('axios');
        axios.post(Config.get('remote.address'), form, {
            onUploadProgress: p => this.setState({uploadProgress: Math.ceil(p.loaded/p.total*100)})
          })
          .then(r => {
            if (200 === r.status && r.data.success) {
              
              // update status of the current entry
              let entry = this.state.entry;
              entry.post_status = r.data.data.post_status;
              entry.url = r.data.data.url;
              entry.post_status = 'publish';
              this.setState({entry}, this.entry_save);

              const btn = <Button key="link" color="inherit" href={entry.url} target="_blank">Open</Button>;
              openSnackbar({message: 'Article published', type: 'success', action: btn});

              data.map(( d, i )=>{
                if( i > index && d.post_status != 'future' && d.post_status !== 'publish') {
                  this.createPostCall( i, data )
                }
              });
            }
          })
          
          .catch(err => { 
            openSnackbar({message: 'Saved offline', type: 'warning'});
          } )
          .finally(() => {
            this.setState({uploadProgress: null});
          });
      });
    }
  }

  publish = (skipEntrySave = '') => {
    if( skipEntrySave != 'publish' ){
      this.entry_save('publish');
      return;
    }
    var blogsData = ''
    Config.getAsync('blogs', [])
      .then(arr => {
        let blogs = {}
        for (let blog of arr) {
          blogs[blog.id] = blog.blog_name;
        }
        blogsData = blogs
      });

    var entries = [];
    var entriesState = this.state.entry;
    localforage.keys()
      .then(keys => keys.filter(key => key.indexOf('post-') === 0))
      .then(keys => keys.map(key => localforage.getItem(key)))
      .then(promises => Promise.all(promises))
      .then(data => {
        data.forEach(e => {
          if (null === e) return;
          const size = e.size ? e.size : 0;
          const dayNum = getTripDay(e);
          entries.push([
            e.id,
            e.title,
            e.location,
            e.author,
            'object' === typeof e.tags ? e.tags.join(', ') : '',
            blogsData[e.blog_id],
            e.body,
            e.date,
            e.files,
            dayNum ? 'Day ' + dayNum : 'undefined',
            size,
            e.url,
            '' === e.post_status ? 'not published': e.post_status,
          ]);
        });
        this.createPostCall(0, data);
        this.setState({ entry: entriesState });
    });

    entryCompress(this.state.entry.id).then(blob => {
      const form = new FormData();
      form.append('action', 'gxg_import');
      form.append('key', Config.get('remote.key'));
      form.append('file', blob, 'export.zip');

      const axios = require('axios');
      axios.post(Config.get('remote.address'), form, {
          onUploadProgress: p => this.setState({uploadProgress: Math.ceil(p.loaded/p.total*100)})
        })
        .then(r => {
          if (200 === r.status && r.data.success) {
            // update status of the current entry
            let entry = this.state.entry;
            entry.post_status = r.data.data.post_status;
            entry.url = r.data.data.url;
            
            this.setState({entry}, this.entry_save);

            const btn = <Button key="link" color="inherit" href={entry.url} target="_blank">Open</Button>;
            openSnackbar({message: 'Article published', type: 'success', action: btn});
          }
        })
        .catch(err => {  
          openSnackbar({message: 'Saved offline', type: 'warning'});
        } )
        .finally(() => {
          this.setState({uploadProgress: null});
        });
    });
  }

  export_entry = () => {
    exportEntries(this.state.entry.id);
  }

  entry_clone = () => {
    const uuid = require('uuid/v4');
    const entry = this.state.entry;

    // duplicate files
    const files = entry.files.length ? entry.files.split(',') : [];
    const promises = files.map(id =>
      localforage.getItem(id).then(entry => {
        const key = uuid();
        entry.id = key;
        localforage.setItem(key, entry);
        return key;
      })
    );

    // replace current entry
    Promise.all(promises).then(ids => {
      entry.id = Math.round((new Date()).getTime() / 1000);
      entry.title += ' - Clone';
      entry.files = ids.join(',');
      entry.post_status = entry.url = '';
      this.setState({entry: entry});
      localforage.setItem('post-'+entry.id, entry)
        .then(() => this.props.changeEditId(entry.id));

      openSnackbar({message: 'Article cloned.', type: 'success'});
    });
  }


  deleteEntryConfirm = () => {
    this.setState({showDeleteEntry:true});
  }
  deleteEntryCancel = () => {
    this.setState({showDeleteEntry:false});
  }
  deleteEntry = () => {
    entry_delete(this.state.entry.id);
    this.deleteEntryCancel();
    this.entry_create_new();
  }

  handleClose() {
    this.setState({imageEdit: false});
  }

  entry_create_new = () => {
    this.setState({entry: this.entry_template()});
  }

  onAutosuggestChange = name => valueObj => {
    const value = valueObj.hasOwnProperty('value') ? valueObj.value : valueObj.map(item => item.value);

    // update tags cache
    if ('tags' === name) {
      let cache = this.state.tagsCache;
      let update = false;
      for (let i = 0; i < value.length; i++) {
        if (-1 === cache.indexOf(value[i])) {
          cache.push(value[i]);
          update = true;
        }
      }
      if (update) {
        this.setState({tagsCache: cache});
        localforage.setItem('tagsCache', cache);
      }
    }

    this.set_field(name, value);
  }

  render() {
    const { classes } = this.props;

    const authorValue = this.state.entry.author
      ? {value: this.state.entry.author, label: this.state.entry.author}
      : null;

    const locationValue = this.state.entry.location
      ? {value: this.state.entry.location, label: this.state.entry.location}
      : null;

    const tagsCache = this.state.tagsCache.map(suggestion => ({
      value: suggestion,
      label: suggestion,
    }));
    const tags = this.state.entry.tags.map(suggestion => ({
      value: suggestion,
      label: suggestion,
    }));

    return (
      <div>
        <FormControl fullWidth>
          <InputLabel htmlFor="blog_id">Blog</InputLabel>
          <Select native
            value={this.state.entry.blog_id}
            onChange={this.valueUpdated}
            inputProps={{name: 'blog_id', id: 'blog_id'}}
          >
            {this.state.blogs.map(blog => (
              <option key={blog.id} value={blog.id}>{blog.blog_name}</option>
            ))}
          </Select>
        </FormControl>

        <Grid container spacing={8}>
          <Grid item xs={12} sm={4}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <DatePicker
                label="Date"
                showTodayButton
                value={this.state.entry.date}
                onChange={this.onDateChange}
                leftArrowIcon={<KeyboardArrowLeft/>}
                rightArrowIcon={<KeyboardArrowRight/>}
                format="d MMM yyyy"
                minDate={this.state.minDate}
                maxDate={this.state.maxDate}
                autoOk
                fullWidth
              />
            </MuiPickersUtilsProvider>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autosuggest
              options={this.state.authors}
              value={authorValue}
              placeholder="Author"
              onChange={this.onAutosuggestChange('author')}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Autosuggest
              options={this.state.locations}
              value={locationValue}
              placeholder="Location"
              onChange={this.onAutosuggestChange('location')}
            />
          </Grid>
        </Grid>

        <FormControl fullWidth>
          <InputLabel htmlFor="title">Title</InputLabel>
          <Input id="title" name="title" value={this.state.entry.title} onChange={this.valueUpdated} />
        </FormControl>

        <FormControl fullWidth>
          <InputLabel htmlFor="body">Description</InputLabel>
          <Input id="body" name="body" value={this.state.entry.body} onChange={this.valueUpdated}
            multiline rows="5" rowsMax="15" />
        </FormControl>

        <FormControl fullWidth>
          <Autosuggest
            options={tagsCache}
            value={tags}
            placeholder="Tags"
            onChange={this.onAutosuggestChange('tags')}
            isMulti
          />
        </FormControl>

        <FileList
          files={this.state.entry.files}
          updateField={this.set_field}
        />

        <div className={classes.btnRow}>
          <div className={classes.mainBtns}>
            <div className={classes.wrapper}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.publish}
                disabled={!!this.state.uploadProgress || !this.state.entry.title}
              >
                Publish
              </Button>
              {this.state.uploadProgress
                && <CircularProgress
                      variant={100 <= this.state.uploadProgress ? 'indeterminate' : 'determinate'}
                      value={this.state.uploadProgress} size={24}
                      className={classes.buttonProgress}
                    />
              }
            </div>

            <Tooltip title="Save">
              <IconButton onClick={this.entry_save}><SaveIcon /></IconButton>
            </Tooltip>
            <Tooltip title="New">
              <IconButton onClick={this.entry_create_new}><CreateIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Export">
              <IconButton onClick={this.export_entry}><ExportIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Clone">
              <IconButton onClick={this.entry_clone}><CopyIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton onClick={this.deleteEntryConfirm}><DeleteIcon /></IconButton>
            </Tooltip>
          </div>

          <div>
            {this.state.entry_saved && <span style={{color: 'rgba(0,0,0,0.45)'}}>Saved</span>}
            {this.state.entry.url &&
              <Tooltip title={this.state.entry.post_status}>
                <IconButton href={this.state.entry.url} target="_blank" className={'status-'+this.state.entry.post_status}><LinkIcon /></IconButton>
              </Tooltip>
            }
          </div>
        </div>

        <Dialog
          open={this.state.showDeleteEntry}
          onClose={this.deleteEntryCancel}
        >
          <DialogContent>
            <DialogContentText>Delete this article?</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button color="primary" onClick={this.deleteEntryCancel} autoFocus>Cancel</Button>
            <Button onClick={this.deleteEntry}>Delete</Button>
          </DialogActions>
        </Dialog>

        <CustomSnackbar />
      </div>
    );
  }
}

export default withStyles(styles, {withTheme: true})(Editor);
