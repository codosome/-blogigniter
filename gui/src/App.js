import React, { Component } from 'react';
import Config from "./Config";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import localforage from "localforage";

import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Button from '@material-ui/core/Button';

import './App.css';
import Editor from './Editor';
import EntriesTable from './EntriesTable';
import ConfigurationTab from './ConfigurationTab';
import CustomSnackbar, { openSnackbar } from './CustomSnackbar';
import "./lib/addtohomescreen/addtohomescreen.css"


const styles = theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
  },
});

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      tab: 0,
      editEntryId: null,
    };

    // check entries status (published or not)
    Config.getAsync('remote.checkInterval', 10)
      .then(interval => setInterval(this.request_entries_state, interval * 60 * 1000));
  }

  componentDidMount = () => {
    // display "Configuration" tab if config is empty
    localforage.getItem('config').then(cfg => null === cfg && this.setState({tab: 2}));

    setTimeout(this.testUpdate, 1000);
  }

  testUpdate() {
   window.isUpdateAvailable && window.isUpdateAvailable
     .then(isAvailable => {
       if (isAvailable) {
          const btn = <Button key="link" color="inherit" onClick={() => window.location.reload()}>Restart</Button>;
          openSnackbar({message: 'Update available!', type: 'info', action: btn});
       }
     });
  }

  entryEdit = (entry_id) => {
    this.setState({editEntryId: entry_id, tab: 0});
  }

  tabChange = (evt, val) => {
    this.setState({tab: val});
  }

  request_entries_state = () => {
    const axios = require('axios');
    let request = {
      method: 'get',
      url: Config.get('remote.address'),
      params: {
        action: 'gxg_get_status',
        id: [],
      }
    };

    localforage.keys()
      .then(keys => keys.filter(key => key.indexOf('post-') === 0))
      .then(keys => request.params.id = keys.map(key => key.substring(5)))
      .then(() => axios(request))
      .then(r => {
        for (let id in r.data) {
          localforage.getItem('post-' + id).then(entry => {
            if (null === entry) return;

            if (r.data[id].url !== entry.url || r.data[id].status !== entry.post_status) {
              entry.url = r.data[id].url;
              entry.post_status = r.data[id].status;
              localforage.setItem('post-' + id, entry);
            }
          });
        }
      });
  }

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <AppBar position="static" color="default">
          <Tabs
            value={this.state.tab}
            onChange={this.tabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Write" />
            <Tab label="Manage" />
            <Tab label="Configuration" />
          </Tabs>
        </AppBar>

        <div style={{marginTop: '5px'}}>
          {this.state.tab === 0 && <Editor id={this.state.editEntryId} changeEditId={this.entryEdit} />}
          {this.state.tab === 1 && <EntriesTable onClickEntry={this.entryEdit} />}
          {this.state.tab === 2 && <ConfigurationTab />}
        </div>
        <CustomSnackbar />
        
      </div>
    );
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(App);
