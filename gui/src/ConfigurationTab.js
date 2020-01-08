import React from "react";
import Config from "./Config";
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import localforage from "localforage";
import Dialog from '@material-ui/core/Dialog';
import TextField from '@material-ui/core/TextField';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import CustomSnackbar, { openSnackbar } from './CustomSnackbar';

class BlogList extends React.Component {
  render() {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Blog Name</TableCell>
            <TableCell align="right">ID</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {this.props.blogs.map(blog => {
            return (
              <TableRow key={blog.id}>
                <TableCell component="th" scope="row">{blog.blog_name}</TableCell>
                <TableCell align="right">{blog.id}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }
}

const styles = theme => ({
  // root: theme.mixins.gutters({
  //   marginTop: theme.spacing.unit * 3,
  //   paddingBottom: 16,
  // }),
  button: {
    margin: theme.spacing.unit,
  },
  hidden: { display: 'none', },
});

class ConfigurationTab extends React.Component {

  constructor() {
    super();
    this.state = {
      blogs: [],
      showClearConfirm: false,
      apiYear: '',
      apiKey: ''
    }
    this.yearHandleChange = this.yearHandleChange.bind(this); 
     
    this.apiKeyChange = this.apiKeyChange.bind(this);
  }

  componentDidMount() {
    this.loadBlogs();
  }

  loadBlogs = () => {
    Config.getAsync('blogs', [])
      .then(blogs => {
        this.setState({blogs});

        if ( ! blogs.length) {
          openSnackbar({message: 'Please import config.xml before work!', type: 'warning'});
        }
      });
  }

  importClicked() {
    document.getElementById('configFile').value = '';
    document.getElementById('configFile').click();
  }

  importApiClicked = () => {
    if( this.state.apiYear !== '' && this.state.apiKey !== '' ) {
      let apiData = Config.processApiXML(this.state.apiYear,this.state.apiKey)
      if(apiData === "invalid api key") {
        openSnackbar({message: 'Invalid api key', type: 'error'});  
      } else if(apiData){
        this.setState({'blogs': apiData});
      } else {
        openSnackbar({message: 'No posts available', type: 'error'});  
      }
    } else {
      openSnackbar({message: 'API key and year needed to import', type: 'warning'});
    }
  }

  configChoosed = (evt) => {
    const reader = new FileReader();
    reader.onload = () => {
      Config.processXML(reader.result)
       .then(() => this.setState({'blogs': Config.get('blogs', [])}));
    }
    reader.readAsText(evt.target.files[0]);
  }

  clearConfirm = () => {
    this.setState({showClearConfirm: true});
  }

  clearConfirmCancel = () => {
    this.setState({showClearConfirm: false});
  }

  clearData = () => {
    localforage.clear().then(() => window.location.reload());
    this.setState({showClearConfirm: false});
  }

  yearHandleChange = (event, index, value) => {
    this.setState({apiYear: index.props.value});
  }

  apiKeyChange = name => event => {
    this.setState({ 'apiKey': event.target.value });
  };

  render() {
    const { classes } = this.props;
    return (
      <div>
        {this.state.blogs && this.state.blogs.length > 0 && <BlogList blogs={this.state.blogs} />}

        <input type="file" id="configFile" className={classes.hidden}
          onChange={this.configChoosed} accept="text/xml" />
        <Button variant="contained" onClick={this.importClicked}
          className={classes.button} color="primary">Import Config...</Button>

        <Button variant="contained" onClick={this.clearConfirm}
          className={classes.button} color="secondary">Clear Data</Button>

        <TextField
                id="apiKey"
                label="Api Key"
                className={classes.textField}
                value={this.state.apiKey}
                onChange={this.apiKeyChange("name")}
              />

        <Select
          value={this.state.apiYear} 
          onChange={this.yearHandleChange}
          displayEmpty
          name="apiYear"
          className="selectYear"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value={2016}>2016</MenuItem>
          <MenuItem value={2017}>2017</MenuItem>
          <MenuItem value={2018}>2018</MenuItem>
          <MenuItem value={2019}>2019</MenuItem>
          <MenuItem value={2020}>2020</MenuItem>
          <MenuItem value={2021}>2021</MenuItem>
          <MenuItem value={2022}>2022</MenuItem>
          <MenuItem value={2023}>2023</MenuItem>
        </Select>

        <Button variant="contained" onClick={this.importApiClicked}
          className={classes.button} color="secondary">Import Api</Button>

{/*
        <div style={{textAlign:'right'}}>Version: {process.env.REACT_APP_VERSION}</div>
*/}

        <Dialog
          open={this.state.showClearConfirm}
          onClose={this.clearConfirmCancel}
        >
          <DialogTitle>Clear all data?</DialogTitle>
          <DialogContent>
            <DialogContentText>All app data will be deleted including articles and configuration.</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button color="primary" onClick={this.clearConfirmCancel} autoFocus>Cancel</Button>
            <Button onClick={this.clearData}>OK</Button>
          </DialogActions>
        </Dialog>

        <CustomSnackbar />
      </div>
    )
  }
}

export default withStyles(styles) (ConfigurationTab);
